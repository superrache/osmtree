import { OverpassFeature, OverpassFeatureCollection } from "./types"

// Independent Overpass services first: gall/lambert/lz4/z.overpass-api.de all belong to the
// same overpass-api.de pool, so listing them separately gives no real failover.
const instances = [
    'https://overpass-api.de',
    'https://overpass.private.coffee'
]

const naturalValues = ['tree', 'shrub', 'plant']

// data is loaded by fixed tiles so that a small pan doesn't download the view again
const TILE_ZOOM = 15 // ~1.2 x 0.8 km at 47°N
const TILE_TTL_MS = 10 * 60 * 1000 // a loaded tile is considered fresh for 10 minutes
const REQUEST_TIMEOUT_MS = 30 * 1000
const RETRY_DELAYS_MS = [1000, 2000, 4000] // backoff before each new attempt

export type ViewBounds = {
    south: number
    west: number
    north: number
    east: number
}

type TileRange = { minX: number, maxX: number, minY: number, maxY: number }

const loadedTiles = new Map<string, number>() // "x/y" -> load timestamp

const lngToTileX = (lng: number) => Math.floor((lng + 180) / 360 * 2 ** TILE_ZOOM)

const latToTileY = (lat: number) => {
    const rad = lat * Math.PI / 180
    return Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * 2 ** TILE_ZOOM)
}

const tileXToLng = (x: number) => x / 2 ** TILE_ZOOM * 360 - 180

const tileYToLat = (y: number) => {
    const n = Math.PI - 2 * Math.PI * y / 2 ** TILE_ZOOM
    return 180 / Math.PI * Math.atan(Math.sinh(n))
}

const isFresh = (key: string, now: number) => {
    const loadedAt = loadedTiles.get(key)
    return loadedAt !== undefined && now - loadedAt < TILE_TTL_MS
}

// smallest tile range containing every missing (or expired) tile of the view, null if all are fresh
const getMissingTileRange = (view: ViewBounds): TileRange | null => {
    const now = Date.now()
    let range: TileRange | null = null
    for (let x = lngToTileX(view.west); x <= lngToTileX(view.east); x++) {
        for (let y = latToTileY(view.north); y <= latToTileY(view.south); y++) {
            if (isFresh(`${x}/${y}`, now)) continue
            range = range === null
                ? { minX: x, maxX: x, minY: y, maxY: y }
                : { minX: Math.min(range.minX, x), maxX: Math.max(range.maxX, x),
                    minY: Math.min(range.minY, y), maxY: Math.max(range.maxY, y) }
        }
    }
    return range
}

const markTilesLoaded = (range: TileRange) => {
    const now = Date.now()
    for (let x = range.minX; x <= range.maxX; x++) {
        for (let y = range.minY; y <= range.maxY; y++) {
            loadedTiles.set(`${x}/${y}`, now)
        }
    }
}

// south,west,north,east of a tile range (Overpass bbox order)
const tileRangeToBbox = (range: TileRange) => {
    const round = (v: number) => Math.round(v * 1e6) / 1e6
    return [
        round(tileYToLat(range.maxY + 1)),
        round(tileXToLng(range.minX)),
        round(tileYToLat(range.minY)),
        round(tileXToLng(range.maxX + 1))
    ].join(',')
}

const buildQuery = (bbox: string) => {
    // exact matches use the tag index (faster than a regex) and exclude tree_stump, shrubbery...
    const statements = naturalValues.map((value) => `node["natural"="${value}"](${bbox});`).join('')
    return `[out:json][timeout:25];(${statements});out qt;`
}

type OverpassElement = {
    type: string
    id: number
    lat: number
    lon: number
    tags?: Record<string, string>
}

const osmToPointFeatureCollection = (elements: OverpassElement[]): OverpassFeatureCollection => {
    const features: OverpassFeature[] = []
    for (const e of elements) {
        if (e.type === 'node' && e.tags !== undefined) {
            features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [e.lon, e.lat] },
                properties: e.tags,
                id: e.id
            })
        }
    }
    return { type: 'FeatureCollection', features: features }
}

// error worth retrying on another instance (overloaded, rate limited, network, timeout)
class RetryableError extends Error {}

const wait = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
})

const fetchFromInstance = async (instance: string, query: string, signal?: AbortSignal) => {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    let response: Response
    try {
        response = await fetch(`${instance}/api/interpreter`, {
            method: 'POST', // form encoded body: no CORS preflight, no URL length limit
            body: new URLSearchParams({ data: query }),
            signal: signal ? AbortSignal.any([signal, timeout]) : timeout
        })
    } catch (error) {
        if (signal?.aborted) throw error // cancelled by the caller
        throw new RetryableError(`${instance}: ${timeout.aborted ? 'timeout' : 'network error'}`)
    }
    if (response.status === 429 || response.status >= 500) {
        throw new RetryableError(`${instance}: HTTP ${response.status}`)
    }
    if (!response.ok) {
        throw new Error(`${instance}: HTTP ${response.status} ${await response.text()}`)
    }
    const data = await response.json()
    if (!data || !Array.isArray(data.elements)) {
        // Overpass reports server-side timeouts/out of memory in "remark" with a 200 status
        throw new RetryableError(`${instance}: ${data?.remark ?? 'invalid response'}`)
    }
    return data.elements as OverpassElement[]
}

/**
 * Loads the trees/shrubs/plants of the missing tiles of the view.
 * Returns null when every tile of the view is already loaded.
 * Throws an AbortError if `signal` is aborted, or an Error when every attempt failed.
 */
export const getOverpassData = async (view: ViewBounds, signal?: AbortSignal): Promise<OverpassFeatureCollection | null> => {
    const range = getMissingTileRange(view)
    if (range === null) return null

    const query = buildQuery(tileRangeToBbox(range))
    const first = Math.floor(Math.random() * instances.length)
    let lastError: unknown = null

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        if (attempt > 0) await wait(RETRY_DELAYS_MS[attempt - 1], signal)
        const instance = instances[(first + attempt) % instances.length]
        try {
            const elements = await fetchFromInstance(instance, query, signal)
            markTilesLoaded(range)
            return osmToPointFeatureCollection(elements)
        } catch (error) {
            if (signal?.aborted) throw error // cancelled by the caller
            // a timeout while reading the body surfaces as a TimeoutError
            const retryable = error instanceof RetryableError
                || (error instanceof DOMException && error.name === 'TimeoutError')
            if (!retryable) throw error
            console.warn('Overpass attempt failed:', (error as Error).message)
            lastError = error
        }
    }
    throw lastError
}

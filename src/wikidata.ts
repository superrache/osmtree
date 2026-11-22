// Wikidata lookups, called directly from the browser (the API allows CORS with origin=*)

const wikidataApi = 'https://www.wikidata.org/w/api.php'
const timeoutMs = 5000

// Wikidata item (e.g. 'Q165145') of a taxon, from its GBIF taxon id (property P846), or undefined
export const getWikidataFromGbif = async (gbifId: string): Promise<string | undefined> => {
    if (!/^\d+$/.test(gbifId)) return undefined
    const url = new URL(wikidataApi)
    url.search = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: `haswbstatement:P846=${gbifId}`,
        srlimit: '1',
        srprop: '',
        format: 'json',
        origin: '*'
    }).toString()
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
        if (!response.ok) return undefined
        const data = await response.json()
        const title: unknown = data?.query?.search?.[0]?.title
        return typeof title === 'string' && /^Q\d+$/.test(title) ? title : undefined
    } catch (error) {
        console.error('Wikidata lookup failed', error)
        return undefined
    }
}

const speciesRanks = ['Q7432', 'Q1306176'] // taxon rank (P105): species, hybrid (nothospecies, e.g. Platanus × hispanica)

// GET on the Wikidata API (CORS with origin=*), undefined on any failure
const callWikidataApi = async (params: Record<string, string>): Promise<any | undefined> => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const url = new URL(wikidataApi)
    url.search = new URLSearchParams({ ...params, format: 'json', origin: '*' }).toString()
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
        if (!response.ok) return undefined
        return await response.json()
    } catch (error) {
        console.error('Wikidata lookup failed', error)
        return undefined
    }
}

// Wikidata item of a species from its scientific name (taxon name P225), if there is exactly one
const getWikidataFromScientificName = async (name: string): Promise<string | undefined> => {
    if (!/^\S+ \S/.test(name) || name.includes('"')) return undefined // a genus alone isn't a species
    const data = await callWikidataApi({
        action: 'query',
        list: 'search',
        srsearch: `haswbstatement:"P225=${name}"`,
        srlimit: '2',
        srprop: ''
    })
    const results: unknown = data?.query?.search
    if (!Array.isArray(results) || results.length !== 1) return undefined // unknown or ambiguous
    const title: unknown = results[0]?.title
    return typeof title === 'string' && /^Q\d+$/.test(title) ? title : undefined
}

// Wikidata item of a species from its French name (exact label or alias), if there is exactly one
// (e.g. 'platane' is the genus Platanus: no species found)
const getWikidataFromFrenchName = async (name: string): Promise<string | undefined> => {
    const normalized = (text: string) => text.normalize('NFC').trim().toLocaleLowerCase('fr')
    const search = await callWikidataApi({
        action: 'wbsearchentities',
        search: name,
        language: 'fr',
        strictlanguage: '1',
        type: 'item',
        limit: '10'
    })
    if (!Array.isArray(search?.search)) return undefined
    const ids: string[] = search.search
        .filter((result: { id?: unknown, match?: { text?: unknown } }) => typeof result.match?.text === 'string'
            && normalized(result.match.text) === normalized(name)
            && typeof result.id === 'string' && /^Q\d+$/.test(result.id))
        .map((result: { id: string }) => result.id)
    if (ids.length === 0) return undefined
    // keep the taxa of rank species
    const entities = await callWikidataApi({ action: 'wbgetentities', ids: ids.join('|'), props: 'claims' })
    const species = ids.filter((id) => {
        const ranks: unknown = entities?.entities?.[id]?.claims?.P105
        return Array.isArray(ranks) && ranks.some((claim) => speciesRanks.includes(claim?.mainsnak?.datavalue?.value?.id))
    })
    return species.length === 1 ? species[0] : undefined
}

// lookups already made (or in progress), by name
const speciesWikidataCache = new Map<string, Promise<string | undefined>>()

// Wikidata item of a species, from its scientific name or else its French name
export const getSpeciesWikidata = (species: string | undefined, speciesFr: string | undefined): Promise<string | undefined> => {
    const cacheKey = `${species ?? ''}|${speciesFr ?? ''}`
    let lookup = speciesWikidataCache.get(cacheKey)
    if (lookup === undefined) {
        lookup = (async () => {
            if (species) return await getWikidataFromScientificName(species.trim())
            if (speciesFr) return await getWikidataFromFrenchName(speciesFr)
            return undefined
        })()
        speciesWikidataCache.set(cacheKey, lookup)
        // not found or failed: try again on the next selection
        lookup.then((wikidata) => { if (wikidata === undefined) speciesWikidataCache.delete(cacheKey) })
    }
    return lookup
}

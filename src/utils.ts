import { Map } from "maplibre-gl"
import { EditableFeature, ExpectedTag } from "./types"
import { expectedTags, naturalTypes } from "./consts"

// API (Cloudflare Pages Functions) is always served on the same origin as the client
// (in dev, Vite proxies /api to `wrangler pages dev`)
export const getApiUrl = (callPoint: string) => `/api/${callPoint}`

export const round6Digits = (a: number) => {
    return (Math.round(a * 100000) / 100000)
}

export const getBounds = (map: Map) => {
    const bounds = map.getBounds()
    const sw = bounds.getSouthWest()
    const ne = bounds.getNorthEast()
    return round6Digits(sw.lat) + ',' + round6Digits(sw.lng) + ',' + round6Digits(ne.lat) + ',' + round6Digits(ne.lng)
}

const toHex = (c: number) => {
    const hex = c.toString(16)
    return hex.length == 1 ? `0${hex}` : hex
}

export const rgbaToHex = (r: number, g: number, b: number, a: number) => {
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`
}

// current natural type of an edited feature: the edited value wins over the original OSM tag
export const getNatural = (ef: EditableFeature): string | undefined => {
    return ef.editingProperties.getValue('natural') ?? ef.feature.properties.natural
}

export const getNaturalLabel = (natural: string | undefined): string => {
    if (natural === undefined) return ''
    return naturalTypes[natural]?.label ?? natural
}

// species name to display: French name, else scientific name
export const getSpeciesName = (properties: Record<string, string>): string => {
    return properties['species:fr'] ?? properties['species'] ?? 'inconnu'
}

// a feature goes to the upload queue as soon as it has changes (like iD: no validation step);
// a feature without position (created by an identification) waits until it is placed
export const isToUpload = (ef: EditableFeature): boolean => {
    const [lng, lat] = ef.feature.geometry.coordinates
    const hasPosition = ef.editingProperties.getNewPosition() !== undefined || lng !== 0 || lat !== 0
    return ef.editingProperties.isDeleted() || (hasPosition && ef.editingProperties.getChangedCount() > 0)
}

// expected tags that are not set yet
export const getMissingExpectedTags = (tags: Record<string, string>): ExpectedTag[] => {
    const keys = Object.keys(tags).filter((key) => tags[key] !== '')
    return expectedTags.filter(({ pattern }) => !keys.some((key) => pattern.test(key)))
}

// share (0 to 1) of the expected tags that are set
export const getTagsCompleteness = (tags: Record<string, string>): number =>
    1 - getMissingExpectedTags(tags).length / expectedTags.length

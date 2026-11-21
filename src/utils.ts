import { Map } from "maplibre-gl"
import { EditableFeature } from "./types"
import { naturalTypes } from "./consts"

export const getServerUrl = () => {
    const url = window.location.origin
    if(url.indexOf('onrender.com') > 0) {
        return url
    } else {
        return url.replace(':5173', ':3000')
    }
}

export const getApiUrl = (callPoint: string) => {
    const url = new URL(`${getServerUrl()}/api/${callPoint}`)
    return url.toString()
}

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

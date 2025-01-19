import { Map } from "maplibre-gl"
import { EditingProperties } from "./types"

export const getServerUrl = () => {
    const url = window.location.origin
    console.log(url)
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
    const sw = bounds._sw
    const ne = bounds._ne
    return round6Digits(sw.lat) + ',' + round6Digits(sw.lng) + ',' + round6Digits(ne.lat) + ',' + round6Digits(ne.lng)
}

export const initEditingProperties = (feature: GeoJSON.Feature) => {
    const editingProperties: EditingProperties = {}
    if (feature.properties) {
        for (const [key, value] of Object.entries(feature.properties)) {
            editingProperties[key] = {
                tagValue: value,
                status: 'unmodified'
            }
        }
        editingProperties[''] = {tagValue: '', status: 'new'}
    }
    return editingProperties
}
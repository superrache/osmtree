import { Map } from "maplibre-gl"

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
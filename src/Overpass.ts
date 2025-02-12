import { DataResponse } from "./types"

const instances = [
    'https://gall.openstreetmap.de',
    'https://lambert.openstreetmap.de',
    'https://lz4.overpass-api.de',
    'https://z.overpass-api.de'
]

const osmToPointFeatureCollection = (elements: any) => {
    const features: Array<GeoJSON.Feature> = []

    try {
        elements.forEach(function(e: any) {
            if(e.type === 'node' && e.hasOwnProperty('tags')) {
                const feature: GeoJSON.Feature = {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [e.lon, e.lat]
                    },
                    properties: e.tags,
                    id: e.id
                }
                features.push(feature)
            }
        })
    } catch(e) {
        console.error(e)
    }

    const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: features
    }
    return geojson
}

export const getOverpassData = async (bounds: string) => {
    const instance = instances[Math.floor(Math.random() * instances.length)]

    const filter = '["natural"~"plant|shrub|tree"]'
    const query = `[out:json][timeout:25];(node${filter}(${bounds}););out body;>;out skel qt;`

    const fullUrl = `${instance}/api/interpreter?data=${encodeURIComponent(query)}`
    //console.log(fullUrl)
    
    const response = await fetch(fullUrl)
    const data = await response.json()
    if (data && data.elements) {
        const geojson = osmToPointFeatureCollection(data.elements)
        return geojson    
    } else {
        console.error(data)
        return null
    }
}

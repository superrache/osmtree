import { useEffect, useRef, useState } from 'react'
import logo from '/osmtree.svg' // also favicon
import { Map, StyleSpecification, NavigationControl, ScaleControl, GeolocateControl, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './MapTab.css'
import { getBounds, getServerUrl } from './utils'
import { DataResponse } from './types'

const MapTab = ({switchToAttributes}) => {
    const mapContainer = useRef<HTMLDivElement | null>(null)
    const map = useRef<Map | null>(null)
    
    let previousBounds = ''
    const markers: Record<string, Marker> = {} // osm id -> marker
    // TODO: empty/unload markers when going far away
    const [loading, setLoading] = useState<boolean>(false)

    const lng = 5.04147
    const lat = 47.32158
    const zoom = 14
    const maxZoomToGetData = 16

    const orthoStyle: StyleSpecification = {
        version: 8,
        name: "bdortho",
        sources: {
            bdortho: {
                type: 'raster',
                tiles: ['https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'],
                tileSize: 256,
                attribution: "<a href='https://geoservices.ign.fr/bdortho' title='BD ORTHO®' target='_blank' class='jawg-attrib'>&copy; <b>IGN</b> BD ORTHO®</a>"
            }
        },
        layers: [
            {
                id: 'tiles',
                type: 'raster',
                source: 'bdortho',
                minzoom: 0,
                maxzoom: 22
            }
        ]
    }

    useEffect(() => {
        if (map.current) return

        if (mapContainer.current) {
            map.current = new Map({
                container: mapContainer.current,
                style: orthoStyle,
                center: [lng, lat],
                zoom: zoom,
                hash: true
            })

            map.current.addControl(
                new NavigationControl({
                    visualizePitch: true,
                    showZoom: true,
                    showCompass: true
                })
            )

            const scale = new ScaleControl({
                maxWidth: 80,
                unit: 'metric'
            })
            map.current.addControl(scale)

            map.current.addControl(new GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true
                },
                trackUserLocation: true
            }))

            map.current.on('load', onMapLoad)
        }
    }, [lng, lat, zoom])

    const onMapLoad = () => {
        console.log('onMapLoad')
        if (map && map.current) {
            map.current.on('moveend', onMapMove)
            map.current.on('click', unselectFeature)
        }
    }

    const onMapMove = async () => {
        console.log('onMapMove')
        if (map && map.current && map.current.getZoom() >= maxZoomToGetData) {
            const bounds = getBounds(map.current)
            if (bounds !== previousBounds) {
                console.log(bounds)
                previousBounds = bounds
                await reload()
            }
        }
    }

    const reload = async () => {
        setLoading(true)

        const codename = btoa(Math.random().toString()).substring(10, 5)
        console.log(`reload ${codename}`)

        const response = await fetch(`${getServerUrl()}/api/data?bounds=${previousBounds}&codename=${codename}`)
        const data: DataResponse = await response.json()
        if (data.error) {
            console.log(`${codename}: query error ${data.error}`)
        } else {
            console.log(`received response for ${data.codename}`)
            if (data.features)
            loadFeatures(data.features)
        }
    }

    const loadFeatures = (features: GeoJSON.Feature[]) => {
        console.log(`loadFeatures with ${features.length} features`)
        features.forEach((feature) => {
            if (feature.id && typeof feature.id === 'number') { // server must provide a feature.id with osm id
                if (!(feature.id in markers)) {
                    const element = document.createElement('div')
                    element.className = 'feature-marker'
                    const icon = document.createElement('img')
                    icon.src = '/osmtree.svg'
                    icon.style = 'width: 10px;'
                    element.appendChild(icon)
                    // add this feature as a marker
                    const marker = new Marker({
                        element: element,
                        clickTolerance: 2
                    })
                    if (feature.geometry.type === 'Point' && map.current) {
                        marker.setLngLat(feature.geometry.coordinates)
                        marker.addTo(map.current)
                        markers[feature.id] = marker
                    }
                }
            }
        })
        setLoading(false)
    }

    const unselectFeature = () => {

    }

    const updateParams = () => {
        console.log('updateAppUrl')
    }

    return (
        <div className="map" ref={mapContainer}>
            <a className="title">
                <img src={logo} className="logo" alt="osmtree" />
                osmtree
            </a>
            { loading && <div className='loading'>Loading</div> }
            <button onClick={switchToAttributes}>Attributs</button>
        </div>
    )
}

export default MapTab

import { useContext, useEffect, useRef, useState } from 'react'
import logo from '/osmtree.svg' // also favicon
import confirmImg from './assets/confirm.svg'
import cancelImg from './assets/cancel.svg'
import crossImg from './assets/cross.svg'
import { Map, StyleSpecification, NavigationControl, ScaleControl, GeolocateControl, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './MapTab.css'
import { getBounds, getServerUrl } from './utils'
import { DataResponse } from './types'
import { naturalTypes } from './consts'
import { FeatureMarker } from './FeatureMarker'
import { SelectedFeatureContext } from './contexts'
import { EditingProperties } from './EditingProperties'

const MapTab = () => {
    const mapContainer = useRef<HTMLDivElement | null>(null)
    const map = useRef<Map | null>(null)
    
    const selectedFeature = useContext(SelectedFeatureContext)
    
    const [loading, setLoading] = useState<boolean>(false)
    const [creatingPosition, setCreatingPosition] = useState<boolean>(false)
    const [userZoom, setUserZoom] = useState<number>(16) // to save user zoom before enabling creatingPosition mode
    const [currentId, setCurrentId] = useState<number>(-1)

    let previousBounds = ''
    const featureMarkers: Record<string, FeatureMarker> = {} // osm id -> marker
    let selectedMarker: FeatureMarker | null = null
    // TODO: empty/unload markers when going far away

    const lng = -1.374801
    const lat = 47.05353
    const zoom = 16
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
            // init map data
            onMapMove()
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
                if (!(feature.id in featureMarkers) && feature.properties && feature.properties.natural) {
                    const naturalType = naturalTypes[feature.properties.natural]
                    const element = document.createElement('div')
                    element.className = 'feature-marker'
                    element.style.cssText = `background-color: ${naturalType.color}`
                    const icon = document.createElement('img')
                    icon.src = naturalType.icon
                    icon.style.cssText = 'width: 14px;'
                    element.appendChild(icon)
                    // add this feature as a marker
                    const featureMarker = new FeatureMarker(feature, {
                        element: element,
                        clickTolerance: 2
                    })
                    if (feature.geometry.type === 'Point' && map.current) {
                        featureMarker.setLngLat([feature.geometry.coordinates[0], feature.geometry.coordinates[1]])
                        featureMarker.addTo(map.current)

                        element.addEventListener('click', (e) => {
                            selectFeature(featureMarker)
                            e.stopPropagation() // pour ne pas cliquer en plus sur la potentielle layer sous le marker
                        })

                        featureMarkers[feature.id] = featureMarker
                    }
                }
            }
        })
        setLoading(false)
    }

    const selectFeature = (featureMarker: FeatureMarker) => {
        unselectFeature()
        selectedMarker = featureMarker
        featureMarker.getElement().classList.add('feature-marker-selected')

        selectedFeature.setValue({
            feature: featureMarker.feature,
            editingProperties: new EditingProperties(featureMarker.feature)
        })
    }

    const unselectFeature = () => {
        if (selectedMarker) {
            selectedMarker.getElement().classList.remove('feature-marker-selected')
            selectedFeature.setValue(null)
            selectedMarker = null
        }
    }

    const onAddButtonClick = () => {
        unselectFeature()

       setCreatingPosition(true)
       zoomFocus(18, true)
    }

    const onCreatePositionCancel = () => {
        setCreatingPosition(false)
        zoomFocus(userZoom)
    }

    const onCreatePositionConfirm = () => {
        setCreatingPosition(false)
        zoomFocus(userZoom)

        if (map.current) {
            const center = map.current.getCenter()
            const feature: GeoJSON.Feature = {
                id: currentId,
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [center.lng, center.lat]
                },
                properties: {natural: 'tree'}
            }
            loadFeatures([feature])
            selectedFeature.setValue({
                feature: feature,
                editingProperties: new EditingProperties(feature)
            })
            // decrease current id
            setCurrentId(currentId - 1)
        }
    }

    const zoomFocus = (zoom: number, saveUserZoom: boolean = false) => {
        if (map.current) {
            if (saveUserZoom) {
                setUserZoom(map.current.getZoom())
                console.log(`previous zoom saved ${userZoom}`)
                if (map.current.getZoom() > zoom) return // don't zoom more than user zoom
            }
            map.current.flyTo({
                center: map.current.getCenter(),
                zoom: zoom
            })
        }
   }

    return (
        <div className="map" ref={mapContainer}>
            <a className="title">
                <img src={logo} className="logo" alt="osmtree" />
                osmtree {selectedFeature.value && selectedFeature.value.feature && selectedFeature.value.feature.id}
            </a>
            { loading && <div className='loading'>Loading</div> }
            { !creatingPosition && <div className="creating-position-buttons">
                <button className="creating-position-button" onClick={onAddButtonClick}>
                    <img src={crossImg} width='50' />
                </button>
            </div> }
            { creatingPosition && <div className="creating-position-buttons">
                <button className="creating-position-button" onClick={onCreatePositionConfirm}>
                    <img src={confirmImg} width='50' />
                </button>
                <button className="creating-position-button" onClick={onCreatePositionCancel}>
                    <img src={cancelImg} width='50' />
                </button>
            </div>}
            { creatingPosition && <div className="cross-marker">
                <img src={crossImg} width='50' />
            </div>}
        </div>
    )
}

export default MapTab

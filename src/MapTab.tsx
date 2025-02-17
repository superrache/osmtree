import { useContext, useEffect, useRef, useState } from 'react'
import logo from '/osmtree.svg' // also favicon
import confirmImg from './assets/confirm.svg'
import cancelImg from './assets/cancel.svg'
import crossImg from './assets/cross.svg'
import layersImg from './assets/layers.svg'
import { Map, StyleSpecification, NavigationControl, ScaleControl, GeolocateControl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './MapTab.css'
import { getBounds } from './utils'
import { MapTabParams, OverpassFeature } from './types'
import { naturalTypes } from './consts'
import { FeatureMarker } from './FeatureMarker'
import { FeatureMarkersContext, MapContext, SelectedFeatureContext } from './contexts'
import { EditingProperties } from './EditingProperties'
import { getOverpassData } from './Overpass'

const MapTab = ({mapTabRef}: MapTabParams) => {
    const mapContainer = useRef<HTMLDivElement | null>(null)
    const map = useRef<Map | null>(null)

    const selectedFeature = useContext(SelectedFeatureContext)
    const featureMarkers = useContext(FeatureMarkersContext)
    const mapContext = useContext(MapContext)

    const [loading, setLoading] = useState<boolean>(false)
    const [creatingPosition, setCreatingPosition] = useState<boolean>(false)
    const [locateSelectedFeature, setLocateSelectedFeature] = useState<boolean>(false)
    const [userZoom, setUserZoom] = useState<number>(16) // to save user zoom before enabling creatingPosition mode
    const [autoBearing, setAutoBearing] = useState<boolean>(false)
    const [mapStyle, setMapStyle] = useState<boolean>(false)

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
        //console.log('onMapLoad')
        if (map && map.current) {
            map.current.on('moveend', onMapMove)
            map.current.on('click', unselectFeature)

            if (window.DeviceOrientationEvent) {
                window.addEventListener(
                    "deviceorientation",
                    handleOrientationEvent,
                    true,
                  )
            }

            // init map data
            onMapMove()
        }
    }

    const handleOrientationEvent = (event: DeviceOrientationEvent) => {
        if (map.current && autoBearing) {
            // alpha : rotation autour de l'axe z
            const rotateDegrees = event.alpha !== null ? event.alpha : 0
            // gamma : de gauche à droite
            //const leftToRight = event.gamma
            // bêta : mouvement avant-arrière
            //const frontToBack = event.beta
            let bearing = rotateDegrees
            // fix portrait/landscape phone orientation
            if (screen.orientation.type === 'landscape-primary') bearing -= 90
            if (screen.orientation.type === 'landscape-secondary') bearing += 90
            if (screen.orientation.type === 'portrait-secondary') bearing += 180
            if (Math.abs(bearing - map.current.getBearing()) > 1) {
                map.current.setBearing(bearing).setPitch(45).setZoom(16)
            }
        }
    }

    const onMapMove = async () => {
        //console.log('onMapMove')
        if (map && map.current && map.current.getZoom() >= maxZoomToGetData) {
            const bounds = getBounds(map.current)
            const mapEl = document.getElementById('map')
            const mapIsVisible = mapEl && mapEl.clientHeight > 0
            if (bounds !== mapContext.bounds && mapIsVisible) {
                mapContext.setBounds(bounds) // update map context
                await reload(bounds)
            }
        }
    }

    const reload = async (bounds: string) => {
        setLoading(true)

        const data = await getOverpassData(bounds)
        if (data && data.features) {
            loadFeatures(data.features)
        }
    }

    const loadFeatures = (features: OverpassFeature[]) => {
        console.log(`loadFeatures with ${features.length} features`)
        const featureMarkersCopy = featureMarkers.value
        for (const feature of features) {
            if (!(feature.id in featureMarkersCopy) && feature.properties.natural) {
                const naturalType = naturalTypes[feature.properties.natural]
                if (naturalType === undefined) console.warn(feature.properties.natural)
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
                if (map.current) {
                    featureMarker.setLngLat([feature.geometry.coordinates[0], feature.geometry.coordinates[1]])
                    featureMarker.addTo(map.current)

                    element.addEventListener('click', (e) => {
                        selectFeature(feature.id, undefined)
                        e.stopPropagation() // pour ne pas cliquer en plus sur la potentielle layer sous le marker
                    })
                    featureMarkersCopy[feature.id] = featureMarker
                }
            }
        }
        featureMarkers.setValue(featureMarkersCopy)
        setLoading(false)
    }

    const selectFeature = (id: number | undefined, editingProperties: EditingProperties | undefined) => {
        // unselect current feature unless editingProperties is given
        if (editingProperties === undefined) unselectFeature()
        // select the feature marker
        if (id && id in featureMarkers.value) {
            const featureMarker = featureMarkers.value[id]
            featureMarker.getElement().classList.add('feature-marker-selected')
            if (editingProperties) {
                const newPos = editingProperties.getNewPosition()
                if (newPos) featureMarker.setLngLat(newPos)
            }
            // select the feature
            console.log('map: select feature', featureMarker.feature.id)
            selectedFeature.setValue({
                feature: featureMarker.feature,
                editingProperties: editingProperties ?? new EditingProperties(featureMarker.feature)
            })
        }
    }

    const unselectFeature = () => {
        console.log('map: unselectFeature', selectedFeature.value) // FIXME: why always null?
        // if we had the selected id, we could target the good marker to unselect
        // else we unselect every marker
        /*if (selectedFeature.value !== null) {
            const id = selectedFeature.value.feature.id
            if (id && id in featureMarkers.value) featureMarkers.value[id].getElement().classList.remove('feature-marker-selected')
        }*/
        Object.values(featureMarkers.value).map((marker) => {
            marker.getElement().classList.remove('feature-marker-selected')
        })
        selectedFeature.setValue(null)
    }

    const onAddButtonClick = () => {
        unselectFeature()
        setCreatingPosition(true)
        setLocateSelectedFeature(false)
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
            const pointGeom: GeoJSON.Point = {
                type: 'Point',
                coordinates: [center.lng, center.lat]
            }

            if (locateSelectedFeature && selectedFeature.value !== null) {
                // locate the current selected feature
                const feature = selectedFeature.value.feature
                feature.geometry = pointGeom
                // conserve current editing properties
                const editingProperties = selectedFeature.value.editingProperties
                editingProperties.setNewPosition(center)
                loadFeatures([feature])
                selectFeature(feature.id, editingProperties)
            } else { // create a new feature and select it
                const feature: OverpassFeature = {
                    id: selectedFeature.getNewId(),
                    type: 'Feature',
                    geometry: pointGeom,
                    properties: {natural: 'tree'}
                }
                loadFeatures([feature])
                // set new position
                const editingProperties = new EditingProperties(feature)
                editingProperties.setNewPosition(center)
                selectFeature(feature.id, editingProperties)
            }
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

    const onLocateFeature = () => {
        setCreatingPosition(true)
        setLocateSelectedFeature(true)
        zoomFocus(18, true)
    }

    const switchMapStyle = () => {
        const newMapStyle = !mapStyle
        if (map.current) {
            if (newMapStyle) {
                map.current.setStyle('https://api.jawg.io/styles/77df562c-113e-451b-bc77-1634aedeee25.json?access-token=UG9wQV1RcEgsXwkTX9M9qfBUV0ZckAfUhlqa3W4hK16gVbTFDUSMXrn60H1hEE6d')
            } else {
                map.current.setStyle(orthoStyle)
            }
        }
        setMapStyle(newMapStyle)
    }

    if (mapTabRef) {
        mapTabRef.current = onLocateFeature
    }

    return (
        <div id="map" className="map" ref={mapContainer}>
            <a className="title">
                <img src={logo} className="logo" alt="osmtree" />
                osmtree
                {map.current && <span> bearing {map.current.getBearing()}°</span>}
            </a>
            {selectedFeature.value !== null && <div className='selection_info'>
                <span className='species_name'>{selectedFeature.value.feature.properties.hasOwnProperty('species:fr') ? 
                    selectedFeature.value.feature.properties['species:fr'] 
                    : (selectedFeature.value.feature.properties.hasOwnProperty('species') ? 
                    selectedFeature.value.feature.properties['species'] : 'inconnu')}</span>
                <br/>
                <span>{naturalTypes[selectedFeature.value.feature.properties['natural']].label}</span>
            </div>}
            { map.current && 
                <div className='maplibregl-ctrl maplibregl-ctrl-group switch-auto-bearing'>
                    <button className='maplibregl-ctrl-compass'
                        onClick={() => { setAutoBearing(!autoBearing) }}
                        style={{color: autoBearing ? 'blue' : 'grey'}}>
                        B
                    </button>
                </div>
            }
            { map.current && 
                <div className='maplibregl-ctrl maplibregl-ctrl-group switch-map-style'>
                    <button className='maplibregl-ctrl-compass'
                        onClick={switchMapStyle}
                        style={{border: mapStyle ? '2px solid #ff9454' : 'none'}}>
                        <img src={layersImg} width='15' />
                    </button>
                </div>
            }
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

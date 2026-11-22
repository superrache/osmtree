import { useContext, useEffect, useRef, useState } from 'react'
import logo from '/osmtree.svg' // also favicon
import confirmImg from './assets/confirm.svg'
import cancelImg from './assets/cancel.svg'
import crossImg from './assets/cross.svg'
import layersImg from './assets/layers.svg'
/*import tree1Img from './assets/collection/1.svg'
import tree2Img from './assets/collection/2.svg'
import tree3Img from './assets/collection/3.svg'
import tree4Img from './assets/collection/4.svg'
import tree5Img from './assets/collection/5.svg'
import tree6Img from './assets/collection/6.svg'
import tree7Img from './assets/collection/7.svg'
import tree8Img from './assets/collection/8.svg'
import tree9Img from './assets/collection/9.svg'
import tree10Img from './assets/collection/10.svg'
import tree11Img from './assets/collection/11.svg'
import tree12Img from './assets/collection/12.svg'
import tree13Img from './assets/collection/13.svg'
import tree14Img from './assets/collection/14.svg'
import tree15Img from './assets/collection/15.svg'
import tree16Img from './assets/collection/16.svg'
import tree17Img from './assets/collection/17.svg'
import tree18Img from './assets/collection/18.svg'
import tree19Img from './assets/collection/19.svg'
import tree20Img from './assets/collection/20.svg'
import tree21Img from './assets/collection/21.svg'
import tree22Img from './assets/collection/22.svg'
import tree23Img from './assets/collection/23.svg'
import tree24Img from './assets/collection/24.svg'
import tree25Img from './assets/collection/25.svg'
import tree26Img from './assets/collection/26.svg'
import tree27Img from './assets/collection/27.svg'
import tree28Img from './assets/collection/28.svg'
import tree29Img from './assets/collection/29.svg'
import tree30Img from './assets/collection/30.svg'
import tree31Img from './assets/collection/31.svg'*/
import type { Point } from 'geojson'
import { Map, StyleSpecification, NavigationControl, ScaleControl, GeolocateControl, AttributionControl, setWorkerUrl } from 'maplibre-gl'
// maplibre-gl 6 resolves its worker relative to import.meta.url, which breaks once Vite bundles it
// (dev: .vite/deps, prod: assets/). Let Vite serve/emit the worker file and give its URL explicitly.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import './MapTab.css'
import { getBounds, getNatural, getNaturalLabel, getSpeciesName } from './utils'
import { EditableFeature, MapTabParams, OverpassFeature } from './types'
import { naturalTypes } from './consts'
import { FeatureMarker } from './FeatureMarker'
import { FeatureMarkersContext, MapContext, OSMConnectionContext, SelectedFeatureContext, UploadedContext } from './contexts'
import { EditingProperties } from './EditingProperties'
import { getOverpassData } from './Overpass'

setWorkerUrl(maplibreWorkerUrl)

const MapTab = ({mapTabRef, focusFeatureRef}: MapTabParams) => {
    const mapContainer = useRef<HTMLDivElement | null>(null)
    const map = useRef<Map | null>(null)
    const [mapLoaded, setMapLoaded] = useState(false)

    const featureMarkers = useContext(FeatureMarkersContext)
    const selectedFeature = useContext(SelectedFeatureContext)
    const osmConnection = useContext(OSMConnectionContext)
    // read from the marker click handlers, registered once (frozen closures)
    const editedFeaturesRef = useRef(osmConnection.value.editedFeatures)
    useEffect(() => {
        editedFeaturesRef.current = osmConnection.value.editedFeatures
    })
    // features deleted from OSM: never redraw them from (possibly outdated) Overpass data
    const deletedIds = useRef(new Set<number>())
    const uploaded = useContext(UploadedContext)
    const mapContext = useContext(MapContext)

    const [loading, setLoading] = useState<boolean>(false)
    const [loadError, setLoadError] = useState<boolean>(false)
    // refs: onMapMove is registered once on the map, it must not rely on render-time state
    const moveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const loadController = useRef<AbortController | null>(null)
    const [creatingPosition, setCreatingPosition] = useState<boolean>(false)
    const [locateSelectedFeature, setLocateSelectedFeature] = useState<boolean>(false)
    const [userZoom, setUserZoom] = useState<number>(16) // to save user zoom before enabling creatingPosition mode
    const [autoBearing, setAutoBearing] = useState<boolean>(false)
    const [mapStyle, setMapStyle] = useState<boolean>(false)

    const lng = -1.374801
    const lat = 47.05353
    const zoom = 16
    const maxZoomToGetData = 16
    const moveDebounceMs = 400

    //const treeImgs = [tree1Img, tree2Img, tree3Img, tree4Img, tree5Img, tree6Img, tree7Img, tree8Img, tree9Img, tree10Img, tree11Img, tree12Img, tree13Img, tree14Img, tree15Img, tree16Img, tree17Img, tree18Img, tree19Img, tree20Img, tree21Img, tree22Img, tree23Img, tree24Img, tree25Img, tree26Img, tree27Img, tree28Img, tree29Img, tree30Img, tree31Img]

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

    // the OSM credit is always shown (AttributionControl's customAttribution):
    // remove the style's own OSM link, e.g. Jawg's "© JawgMaps | © OpenStreetMap"
    const withoutOsmAttribution = (style: StyleSpecification): StyleSpecification => {
        const osmLink = /\s*\|?\s*<a [^>]*openstreetmap\.org\/copyright[^>]*>.*?<\/a>/g
        const sources = Object.fromEntries(Object.entries(style.sources).map(([id, source]) => [
            id,
            'attribution' in source && source.attribution !== undefined
                ? { ...source, attribution: source.attribution.replace(osmLink, '').trim() }
                : source
        ]))
        return { ...style, sources: sources as StyleSpecification['sources'] }
    }

    const onMapLoad = () => {
        //console.log('onMapLoad')
        setMapLoaded(true)
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
            // new features restored from the local save (Overpass doesn't know them)
            loadFeatures(Object.values(editedFeaturesRef.current)
                .filter(({ feature }) => feature.id < 0)
                .map(({ feature, editingProperties }) => {
                    const newPosition = editingProperties.getNewPosition()
                    // a feature placed after its creation by an identification has no geometry yet
                    return newPosition ? { ...feature, geometry: { type: 'Point' as const, coordinates: [newPosition.lng, newPosition.lat] } } : feature
                })
                .filter((feature) => feature.geometry.coordinates[0] !== 0 || feature.geometry.coordinates[1] !== 0))
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

    useEffect(() => {
        return () => { // unmount: stop pending work
            clearTimeout(moveTimer.current)
            loadController.current?.abort()
        }
    }, [])

    // wait for the end of the moves before requesting data
    const onMapMove = () => {
        clearTimeout(moveTimer.current)
        moveTimer.current = setTimeout(loadVisibleData, moveDebounceMs)
    }

    const loadVisibleData = async () => {
        if (!map.current || map.current.getZoom() < maxZoomToGetData) return
        const mapEl = document.getElementById('map')
        if (!mapEl || mapEl.clientHeight === 0) return // map tab hidden

        mapContext.setBounds(getBounds(map.current)) // update map context

        // only one request at a time: cancel the previous one
        loadController.current?.abort()
        const controller = new AbortController()
        loadController.current = controller

        const bounds = map.current.getBounds()
        setLoading(true)
        setLoadError(false)
        try {
            const data = await getOverpassData({
                south: bounds.getSouth(),
                west: bounds.getWest(),
                north: bounds.getNorth(),
                east: bounds.getEast()
            }, controller.signal)
            if (data) loadFeatures(data.features) // null: every tile already loaded
        } catch (error) {
            if (controller.signal.aborted) return // replaced by a newer request
            console.error('Overpass data unavailable', error)
            setLoadError(true)
        } finally {
            if (loadController.current === controller) {
                loadController.current = null
                setLoading(false)
            }
        }
    }

    const loadFeatures = (features: OverpassFeature[], idsToDeleteBeforeLoading: number[] = []) => {
        const featureMarkersCopy = featureMarkers.value

        if (idsToDeleteBeforeLoading.length > 0) {
            console.log(`delete ${idsToDeleteBeforeLoading.length} features`)
            // if a feature to delete is selected, reset selection
            if (selectedFeature.value !== null && idsToDeleteBeforeLoading.includes(selectedFeature.value.feature.id)) {
                selectedFeature.setValue(null)
            }
            for (const id of idsToDeleteBeforeLoading) {
                if (id in featureMarkersCopy) {
                    featureMarkersCopy[id].remove()
                    delete featureMarkersCopy[id]
                }
            }
        }

        console.log(`loadFeatures with ${features.length} features`)
        for (const feature of features) {
            if (!(feature.id in featureMarkersCopy) && !deletedIds.current.has(feature.id) && feature.properties.natural) {
                const element = document.createElement('div')
                element.className = 'feature-marker'
                const icon = document.createElement('img')
                //icon.src = treeImgs[Math.floor(Math.random() * 31)]
                icon.style.cssText = 'width: 14px;'
                element.appendChild(icon)
                // a feature in the upload queue (e.g. restored after a reload) shows its pending changes
                const queued = editedFeaturesRef.current[feature.id]?.editingProperties
                styleMarkerElement(element, queued?.getValue('natural') ?? feature.properties.natural)
                if (queued?.isDeleted()) element.classList.add('feature-marker-deleted')
                // add this feature as a marker
                const featureMarker = new FeatureMarker(feature, {
                    element: element,
                    clickTolerance: 2
                })
                featureMarker.setLngLat(queued?.getNewPosition() ?? [feature.geometry.coordinates[0], feature.geometry.coordinates[1]])
                if (map.current) featureMarker.addTo(map.current)
                element.addEventListener('click', (e) => {
                    selectFeature(feature.id, undefined)
                    e.stopPropagation() // pour ne pas cliquer en plus sur la potentielle layer sous le marker
                })
                featureMarkersCopy[feature.id] = featureMarker
            }
        }

        featureMarkers.setValue(featureMarkersCopy)
    }

    // apply the natural type colour and icon to a marker element
    const styleMarkerElement = (element: HTMLElement, natural: string | undefined) => {
        const naturalType = natural !== undefined ? naturalTypes[natural] : undefined
        if (naturalType === undefined) return
        element.style.backgroundColor = naturalType.color
        const icon = element.querySelector('img')
        if (icon) icon.src = naturalType.icon
    }

    // update the existing marker in place (no remove/recreate: keeps the selection,
    // the 'feature-marker-selected' class and the click handler)
    const updateMarker = (feature: OverpassFeature, editingProperties?: EditingProperties) => {
        const featureMarker = featureMarkers.value[feature.id]
        if (featureMarker === undefined) return // e.g. feature created in IdentifierTab, not on the map yet
        const natural = editingProperties?.getValue('natural') ?? feature.properties.natural
        styleMarkerElement(featureMarker.getElement(), natural)
        // edited position, else the original one (e.g. after Cancel)
        const [lng, lat] = feature.geometry.coordinates
        featureMarker.setLngLat(editingProperties?.getNewPosition() ?? [lng, lat])
    }

    useEffect(() => {
        if (selectedFeature.value !== null) {
            // natural type or position may have changed (IdentifierTab, Cancel): refresh the marker
            updateMarker(selectedFeature.value.feature, selectedFeature.value.editingProperties)
        }
    }, [selectedFeature.value])

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
            // a feature already in the upload queue shows its pending changes (copy, applied on validation)
            const queued = editedFeaturesRef.current[id]
            selectedFeature.setValue({
                feature: featureMarker.feature,
                editingProperties: editingProperties
                    ?? queued?.editingProperties.clone(featureMarker.feature)
                    ?? new EditingProperties(featureMarker.feature)
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
            const pointGeom: Point = {
                type: 'Point',
                coordinates: [center.lng, center.lat]
            }

            if (locateSelectedFeature && selectedFeature.value !== null) {
                // locate the current selected feature: only the editing properties get the new position,
                // feature.geometry keeps the original one (Cancel puts the marker back there)
                const feature = selectedFeature.value.feature
                // conserve current editing properties
                const editingProperties = selectedFeature.value.editingProperties
                editingProperties.setNewPosition(center)
                // a feature without marker yet (created by an identification, at [0, 0]) gets one here
                if (!(feature.id in featureMarkers.value)) loadFeatures([{ ...feature, geometry: pointGeom }])
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
                map.current.setStyle('https://api.jawg.io/styles/77df562c-113e-451b-bc77-1634aedeee25.json?access-token=UG9wQV1RcEgsXwkTX9M9qfBUV0ZckAfUhlqa3W4hK16gVbTFDUSMXrn60H1hEE6d', {
                    transformStyle: (_previous, next) => withoutOsmAttribution(next)
                })
            } else {
                map.current.setStyle(orthoStyle)
            }
        }
        setMapStyle(newMapStyle)
    }

    // select a feature (e.g. an edited feature from UploadTab) and center the map on it
    const focusFeature = (editableFeature: EditableFeature) => {
        const { feature } = editableFeature
        const editingProperties = editableFeature.editingProperties.clone(feature)
        unselectFeature()
        if (feature.id in featureMarkers.value) {
            selectFeature(feature.id, editingProperties)
        } else { // no marker (e.g. feature without position): select it anyway
            selectedFeature.setValue({ feature, editingProperties })
        }

        // edited position first, then the original one ([0, 0] means no position)
        const newPosition = editingProperties.getNewPosition()
        const [lng, lat] = feature.geometry.coordinates
        const center: [number, number] | undefined = newPosition ? [newPosition.lng, newPosition.lat]
            : (lng !== 0 || lat !== 0) ? [lng, lat] : undefined
        if (map.current && center) {
            map.current.flyTo({
                center: center,
                zoom: Math.max(map.current.getZoom(), 18)
            })
        }
    }

    useEffect(() => {
        const reloadedIds = new Set(uploaded.value.features.map((feature) => feature.id))
        for (const id of uploaded.value.idsToDelete) {
            if (id > 0 && !reloadedIds.has(id)) deletedIds.current.add(id)
        }
        loadFeatures(uploaded.value.features, uploaded.value.idsToDelete)
    }, [uploaded])

    useEffect(() => {
        if (map.current) return

        if (mapContainer.current) {
            map.current = new Map({
                container: mapContainer.current,
                style: orthoStyle,
                center: [lng, lat],
                zoom: zoom,
                hash: true,
                attributionControl: false // added below, with the OSM credit
            })

            // the trees come from OSM whatever the background: credit it with every style
            // (customAttribution doesn't depend on the style's sources: it survives setStyle)
            map.current.addControl(new AttributionControl({
                customAttribution: "<a href='https://www.openstreetmap.org/copyright' target='_blank'>&copy; les contributeurs d'OpenStreetMap</a>"
            }))

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

    useEffect(() => { // keep the latest closures (current markers and selection)
        mapTabRef.current = onLocateFeature
        focusFeatureRef.current = focusFeature
    })

    return (
        <div id="map" className="map" ref={mapContainer}>
            <a className="title">
                <img src={logo} className="logo" alt="osmtree" />
                osmtree
                {selectedFeature.value && <span>id={selectedFeature.value?.feature.id}</span>}
            </a>
            {selectedFeature.value !== null && <div className='selection_info'>
                <span className='species_name'>{getSpeciesName(selectedFeature.value.feature.properties)}</span>
                <br/>
                <span>{getNaturalLabel(getNatural(selectedFeature.value))}</span>
            </div>}
            { mapLoaded && 
                <div className='maplibregl-ctrl maplibregl-ctrl-group switch-auto-bearing'>
                    <button className='maplibregl-ctrl-compass'
                        onClick={() => { setAutoBearing(!autoBearing) }}
                        style={{color: autoBearing ? 'blue' : 'grey'}}>
                        B
                    </button>
                </div>
            }
            { mapLoaded && 
                <div className='maplibregl-ctrl maplibregl-ctrl-group switch-map-style'>
                    <button className='maplibregl-ctrl-compass'
                        onClick={switchMapStyle}
                        style={{border: mapStyle ? '2px solid #ff9454' : 'none'}}>
                        <img src={layersImg} width='15' />
                    </button>
                </div>
            }
            { loading && <div className='loading'>Chargement…</div> }
            { !loading && loadError && <div className='loading load-error'>
                Données indisponibles <button onClick={loadVisibleData}>Réessayer</button>
            </div> }
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

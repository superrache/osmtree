import { useEffect, useRef, useState } from "react"
import './App.css'
import mapImg from './assets/map.svg'
import attributesImg from './assets/attributes.svg'
import identifyImg from './assets/identify.svg'
import imageImg from './assets/image.svg'
import uploadImg from './assets/upload.svg'
import IdentifierTab from "./IdentifierTab"
import MapTab from "./MapTab"
import AttributesTab from "./AttributesTab"
import UploadTab from "./UploadTab"
import { EditableFeature, OSMConnection, OsmRequestClient, PreviousFeature, SelectedFeature, Tab, Uploaded } from "./types"
import { FeatureMarkersContext, MapContext, OSMConnectionContext, SelectedFeatureContext, UploadedContext } from "./contexts"
import { osmAuth } from 'osm-auth'
import OsmRequest from 'osm-request'
import { osmConfig } from "./consts"
import NotificationBadge from "./NotificationBadge"
import WikiTab from "./WikiTab"
import { FeatureMarker } from "./FeatureMarker"
import { loadEditedFeatures, saveEditedFeatures } from "./editedFeaturesStorage"
import { isToUpload } from "./utils"

// single instances for the whole app (osm-request uses osm-auth once connected)
const auth = new osmAuth(osmConfig)
const osmRequest: OsmRequestClient = new OsmRequest(osmConfig)

const App = () => {
    const [activeTab, setActiveTab] = useState(0)
    const [selectedFeature, setSelectedFeature] = useState<SelectedFeature>(null)
    const [featureMarkers, setFeatureMarkers] = useState<Record<number, FeatureMarker>>({})
    const [mapBounds, setMapBounds] = useState<string>('0,0,0,0')
    const [osmConnection, setOsmConnection] = useState<OSMConnection>(() => ({
        userName: '',
        auth: auth,
        osmRequest: osmRequest,
        editedFeatures: loadEditedFeatures() // queue saved before a reload
    }))
    // ids of the new features: -1, -2… (a ref, so that two creations in the same render get different ids)
    // after a reload, continue below the restored new features
    const nextNewId = useRef(Math.min(0, ...Object.keys(osmConnection.editedFeatures).map(Number)) - 1)
    // tags of the last edited feature, to duplicate them on the next one (e.g. a row of trees)
    const [previousFeature, setPreviousFeature] = useState<PreviousFeature>(null)
    // selection as last set (setSelection is also called from MapLibre handlers registered once)
    const selectedFeatureRef = useRef<SelectedFeature>(null)
    const [uploaded, setUploaded] = useState<Uploaded>({features: [], idsToDelete: []})

    // every change of the selected feature goes to the upload queue right away (like iD):
    // no validation step, nothing is lost when another feature or the map is clicked.
    // Only refs and stable setters here: frozen closures (MapLibre handlers) call it too.
    const setSelection = (value: SelectedFeature) => {
        const previous = selectedFeatureRef.current
        selectedFeatureRef.current = value
        setSelectedFeature(value)
        if (previous !== null && previous.feature.id !== value?.feature.id
            && isToUpload(previous) && !previous.editingProperties.isDeleted()) {
            setPreviousFeature({ id: previous.feature.id, tags: previous.editingProperties.getTagsToSend() })
        }
        if (value === null) return
        const id = value.feature.id
        setOsmConnection((connection) => {
            const toUpload = isToUpload(value)
            if (!toUpload && !(id in connection.editedFeatures)) return connection
            const editedFeatures = { ...connection.editedFeatures }
            if (toUpload) editedFeatures[id] = value
            else delete editedFeatures[id] // back to the original state (e.g. Cancel)
            return { ...connection, editedFeatures: editedFeatures }
        })
    }

    useEffect(() => {
        saveEditedFeatures(osmConnection.editedFeatures)
    }, [osmConnection.editedFeatures])

    const mapTabRef = useRef<(() => void) | undefined>(undefined)
    const focusFeatureRef = useRef<((feature: EditableFeature) => void) | undefined>(undefined)

    // notification badges, derived from the state
    const changedAttributesCount = selectedFeature !== null ? selectedFeature.editingProperties.getChangedCount() : 0
    const readyToSendFeatureCount = Object.keys(osmConnection.editedFeatures).length

    const handleOnLocateFeature = () => {
        setActiveTab(0)
        setTimeout(() => {
            if (typeof mapTabRef.current === 'function') {
                mapTabRef.current()
            }
          }, 0)
    }

    // select a feature and show it on the map tab
    const handleShowFeature = (feature: EditableFeature) => {
        setActiveTab(0)
        setTimeout(() => focusFeatureRef.current?.(feature), 0) // once the map tab is displayed
    }

    const osmLogin = () => {
        console.log('osmLogin')
        if (!auth.authenticated()) {
            auth.authenticate((err) => {
                if(err) {
                    console.error(err)
                    osmLogout()
                }
                else {
                    getOsmUserName()
                }
            })
        }
    }

    // functional updates: these callbacks may run long after the render that created them
    const osmLogout = () => {
        console.log('osmLogout')
        if (auth.authenticated()) {
            auth.logout()
            osmRequest._auth = null
            setOsmConnection((connection) => ({ ...connection, userName: '' }))
        }
    }

    const getOsmUserName = () => {
        console.log('getOsmUserName')
        if(auth.authenticated()) {
            //Get user details
            auth.xhr({
                method: 'GET',
                path: '/api/0.6/user/details'
            }, (err, details) => {
                if(err) {
                    console.log(err)
                    osmLogout()
                    return
                }
                const userName = details instanceof Document ? details.querySelector('user')?.getAttribute('display_name') : null
                if (!userName) {
                    console.error('OSM user details without display_name', details)
                    osmLogout()
                    return
                }
                console.log('connected as', userName)
                osmRequest._auth = auth
                // update context
                setOsmConnection((connection) => ({ ...connection, userName: userName }))
            })
        }
    }

    const tabs: Tab[] = [
        { icon: mapImg, label: 'Carte', notificationCount: 0, content: <MapTab mapTabRef={mapTabRef} focusFeatureRef={focusFeatureRef}></MapTab> },
        { icon: attributesImg, label: 'Attributs', notificationCount: changedAttributesCount, content: <AttributesTab onLocateFeature={handleOnLocateFeature}></AttributesTab> },
        { icon: identifyImg, label: 'Assistant', notificationCount: 0, content: <IdentifierTab></IdentifierTab> },
        { icon: imageImg, label: 'Wiki', notificationCount: 0, content: <WikiTab></WikiTab> },
        { icon: uploadImg, label: 'Envoi OSM', notificationCount: readyToSendFeatureCount, content: <UploadTab osmLogin={osmLogin} osmLogout={osmLogout} onShowFeature={handleShowFeature}></UploadTab> }
    ]

    // landing from osm authentication page: handled once per page load, in an effect
    // (in render, StrictMode's double render called authenticate() again after the saved
    // OAuth state had been consumed, which started a new login: endless redirect loop)
    const oauthLandingHandled = useRef(false)
    useEffect(() => {
        if (oauthLandingHandled.current) return // StrictMode runs effects twice in dev
        oauthLandingHandled.current = true

        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const error = params.get('error')
        if (code !== null || error !== null) {
            // remove the OAuth parameters right away (keep the map position in the hash)
            window.history.replaceState(null, '', window.location.pathname + window.location.hash)
            if (error !== null) {
                console.error('OSM authentication refused', error, params.get('error_description'))
            } else if (code !== null && !auth.authenticated()) {
                auth.bootstrapToken(code, (err) => {
                    if (err) {
                        console.error('OSM authentication failed', err)
                        return
                    }
                    console.log('Authentication success')
                    getOsmUserName()
                    setActiveTab(4)
                }, params.get('state') ?? undefined)
            }
        } else if (auth.authenticated()) {
            // already connected at startup, just update username
            getOsmUserName()
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per page load, on purpose
    }, [])

    return (
        <OSMConnectionContext.Provider value={{
            value: osmConnection,
            setValue: setOsmConnection
        }}>
            <FeatureMarkersContext.Provider value={{
                value: featureMarkers,
                setValue: setFeatureMarkers
            }}>
                <SelectedFeatureContext.Provider value={{
                    value: selectedFeature,
                    setValue: setSelection,
                    previous: previousFeature,
                    getNewId: () => nextNewId.current--
                }}>
                    <UploadedContext.Provider value={{
                        value: uploaded,
                        setValue: setUploaded
                    }}>
                        <MapContext.Provider value={{
                            bounds: mapBounds,
                            setBounds: setMapBounds
                        }}>
                            <div className="app">
                                <main className="tab_content">
                                    {tabs.map((tab, index) => (
                                        <div
                                        key={index}
                                        className={`${activeTab === index ? 'block' : 'hidden'}`}
                                    >
                                        {tab.content}
                                    </div>
                                    ))}
                                </main>
                                <nav className="tabs_bar">
                                    {tabs.map((tab, index) => {
                                        return (
                                            <button key={index}
                                                onClick={() => setActiveTab(index)}
                                                className={`tab_button ${activeTab === index ? 'tab_selected' : ''}`}>
                                                <div className="tab-icon-container">
                                                    <img src={tab.icon} width='50' />
                                                    <NotificationBadge count={tab.notificationCount}></NotificationBadge>
                                                </div>
                                                <span className="tab-label">
                                                    {tab.label}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </nav>
                            </div>
                        </MapContext.Provider>
                    </UploadedContext.Provider>
                </SelectedFeatureContext.Provider>
            </FeatureMarkersContext.Provider>
        </OSMConnectionContext.Provider>

    )
}

export default App

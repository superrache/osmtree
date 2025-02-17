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
import { OSMConnection, SelectedFeature, Tab } from "./types"
import { FeatureMarkersContext, MapContext, OSMConnectionContext, SelectedFeatureContext } from "./contexts"
import { FeatureMarker } from "./FeatureMarker"
import { osmAuth } from 'osm-auth'
import OsmRequest from 'osm-request'
import { osmConfig } from "./consts"
import NotificationBadge from "./NotificationBadge"
import WikiTab from "./WikiTab"

const App = () => {
    const [activeTab, setActiveTab] = useState(0)
    const [selectedFeature, setSelectedFeature] = useState<SelectedFeature>(null)
    const [featureMarkers, setFeatureMarkers] = useState<Record<number, FeatureMarker>>({})
    const [mapBounds, setMapBounds] = useState<string>('0,0,0,0')
    const [osmConnection, setOsmConnection] = useState<OSMConnection>({
        userName: '',
        auth: osmAuth(osmConfig),
        osmRequest: new OsmRequest(osmConfig),
        editedFeatures: {}
    })
    const [currentId, setCurrentId] = useState<number>(-1)

    const [readyToSendFeatureCount, setReadyToSendFeatureCount] = useState(0)

    const mapTabRef = useRef<(() => void) | undefined>(undefined)

    useEffect(() => {
        console.log('APP: selectedFeature updated', selectedFeature !== null ? selectedFeature.feature.id : null)
        const attrCount = (selectedFeature !== null && selectedFeature.editingProperties) ? selectedFeature.editingProperties.getChangedCount() : 0
        if (attrCount !== tabs[1].notificationCount) {
            tabs[1].notificationCount = attrCount
            setTabs(Array.from(tabs))
        }
    }, [selectedFeature])

    useEffect(() => {
        const featureCount = Object.keys(osmConnection.editedFeatures).length
        if (readyToSendFeatureCount !== featureCount) {
            setReadyToSendFeatureCount(featureCount)
            tabs[4].notificationCount = featureCount
            setTabs(tabs)
        }
    }, [osmConnection])

    const handleOnLocateFeature = () => {
        setActiveTab(0)
        setTimeout(() => {
            if (typeof mapTabRef.current === 'function') {
                mapTabRef.current()
            }
          }, 0)
    }

    const osmLogin = () => {
        console.log('osmLogin')
        if (osmConnection.auth && !osmConnection.auth.authenticated()) {
            osmConnection.auth.authenticate((err: any, res: any) => {
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

    const osmLogout = () => {
        console.log('osmLogout')
        if (osmConnection.auth && osmConnection.auth.authenticated()) {
            osmConnection.auth.logout()
            osmConnection.osmRequest._auth = null
            setOsmConnection({
                userName: '',
                auth: osmConnection.auth,
                osmRequest: osmConnection.osmRequest,
                editedFeatures: osmConnection.editedFeatures
            })
        }
    }

    const getOsmUserName = () => {
        console.log('getOsmUserName')
        if(osmConnection.auth.authenticated() && osmConnection.userName.length === 0) {
            //Get user details
            osmConnection.auth.xhr({
                method: 'GET',
                path: '/api/0.6/user/details'
            }, (err: any, details: any) => {
                if(err) {
                    console.log(err)
                    osmLogout()
                }
                else {
                    try {
                        const userName = details.firstChild.childNodes[1].attributes.display_name.value
                        console.log('connected as', userName)
                        osmConnection.osmRequest._auth = osmConnection.auth
                        // update context
                        setOsmConnection({
                            userName: userName,
                            auth: osmConnection.auth,
                            osmRequest: osmConnection.osmRequest,
                            editedFeatures: osmConnection.editedFeatures
                        })
                    }
                    catch(e) {
                        console.error(e)
                        osmLogout()
                    }
                }
            })
        }
    }

    const [tabs, setTabs] = useState<Tab[]>([
        { icon: mapImg, label: 'Carte', notificationCount: 0, content: <MapTab mapTabRef={mapTabRef}></MapTab> },
        { icon: attributesImg, label: 'Attributs', notificationCount: 0, content: <AttributesTab onLocateFeature={handleOnLocateFeature}></AttributesTab> },
        { icon: identifyImg, label: 'Assistant', notificationCount: 0, content: <IdentifierTab></IdentifierTab> },
        { icon: imageImg, label: 'Wiki', notificationCount: 0, content: <WikiTab></WikiTab> },
        { icon: uploadImg, label: 'Envoi OSM', notificationCount: 0, content: <UploadTab osmLogin={osmLogin} osmLogout={osmLogout}></UploadTab> }
    ])

    // landing from osm authentication page
    const params = new URLSearchParams((window.location.search || '?').substring(1))
    if (params.get('code') !== null && osmConnection.auth && !osmConnection.auth.authenticated()) {
        osmConnection.auth.authenticate(() => {
            console.log('Authentication success')
            setTimeout(() => getOsmUserName(), 100)
            window.history.replaceState(null, '', window.location.href.replace(window.location.search, ""))
            setActiveTab(4)
        })
    } else if (osmConnection.auth && osmConnection.auth.authenticated() && osmConnection.userName.length === 0) { // already connected at startup, just update username
        getOsmUserName()
    }

    return (
        <OSMConnectionContext.Provider value={{
            value: osmConnection,
            setValue: setOsmConnection
        }}>
            <SelectedFeatureContext.Provider value={{
                value: selectedFeature,
                setValue: setSelectedFeature,
                getNewId: () => {setCurrentId(currentId - 1); return currentId}
            }}>
                <FeatureMarkersContext.Provider value={{
                    value: featureMarkers,
                    setValue: setFeatureMarkers
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
                </FeatureMarkersContext.Provider>
            </SelectedFeatureContext.Provider>
        </OSMConnectionContext.Provider>

    )
}

export default App

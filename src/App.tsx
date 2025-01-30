import { useEffect, useRef, useState } from "react"
import './App.css'
import mapImg from './assets/map.svg'
import attributesImg from './assets/attributes.svg'
import identifyImg from './assets/identify.svg'
import uploadImg from './assets/upload.svg'
import IdentifierTab from "./IdentifierTab"
import MapTab from "./MapTab"
import AttributesTab from "./AttributesTab"
import UploadTab from "./UploadTab"
import { OSMConnection, SelectedFeature } from "./types"
import { MapContext, OSMConnectionContext, SelectedFeatureContext } from "./contexts"

const App = () => {
    const [activeTab, setActiveTab] = useState(0)
    const [selectedFeature, setSelectedFeature] = useState<SelectedFeature>(null)
    const [mapBounds, setMapBounds] = useState<string>('0,0,0,0')
    const [osmConnection, setOsmConnection] = useState<OSMConnection>({connected: false, userName: ''})
    const [currentId, setCurrentId] = useState<number>(-1)

    const mapTabRef = useRef<() => void>()

    useEffect(() => {
        console.log('APP: mapBounds updated', mapBounds)
    }, [mapBounds])

    useEffect(() => {
        console.log('APP: selectedFeature updated', selectedFeature)
    }, [selectedFeature])

    const handleOnLocateFeature = () => {
        setActiveTab(0)
        setTimeout(() => {
            if (typeof mapTabRef.current === 'function') {
                mapTabRef.current()
            }
          }, 0)
    }

    const tabs = [
        { icon: mapImg, label: 'Carte', content: <MapTab mapTabRef={mapTabRef}></MapTab> },
        { icon: attributesImg, label: 'Attributs', content: <AttributesTab onLocateFeature={handleOnLocateFeature}></AttributesTab> },
        { icon: identifyImg, label: 'Identifier', content: <IdentifierTab></IdentifierTab> },
        { icon: uploadImg, label: 'Envoi OSM', content: <UploadTab></UploadTab> }
    ]

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
                                    <label key={index}
                                        onClick={() => setActiveTab(index)}
                                        className={`tab_button ${activeTab === index ? 'tab_selected' : ''}`}>
                                        <img src={tab.icon} width='50' />
                                        {tab.label}
                                    </label>
                                )
                            })}
                        </nav>
                    </div>
                </MapContext.Provider>
            </SelectedFeatureContext.Provider>
        </OSMConnectionContext.Provider>

    )
}

export default App

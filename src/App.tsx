import { useState } from "react"
import './App.css'
import mapImg from './assets/map.svg'
import attributesImg from './assets/attributes.svg'
import identifyImg from './assets/identify.svg'
import uploadImg from './assets/upload.svg'
import IdentifierTab from "./IdentifierTab"
import MapTab from "./MapTab"
import AttributesTab from "./AttributesTab"
import UploadTab from "./UploadTab"
import { EditingProperties, OSMConnection, SelectedFeature } from "./types"
import { OSMConnectionContext, SelectedFeatureContext } from "./contexts"

const App = () => {
    const [activeTab, setActiveTab] = useState(0)
    const [selectedFeature, setSelectedFeature] = useState<SelectedFeature>(null)
    const [osmConnection, setOsmConnection] = useState<OSMConnection>({connected: false, userName: ''})

    const tabs = [
        { icon: mapImg, label: 'Carte', content: <MapTab></MapTab> },
        { icon: attributesImg, label: 'Attributs', content: <AttributesTab></AttributesTab> },
        { icon: identifyImg, label: 'Identifier', content: <IdentifierTab></IdentifierTab> },
        { icon: uploadImg, label: 'Envoi OSM', content: <UploadTab></UploadTab> }
    ]

    const setSelectedFeatureEditing = (feature: SelectedFeature) => {
        setSelectedFeature(feature)
    }

    return (
        <OSMConnectionContext.Provider value={{
            value: osmConnection,
            setValue: setOsmConnection
        }}>
            <SelectedFeatureContext.Provider value={{
                value: selectedFeature,
                setValue: setSelectedFeatureEditing
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
            </SelectedFeatureContext.Provider>
        </OSMConnectionContext.Provider>
    )
}

export default App

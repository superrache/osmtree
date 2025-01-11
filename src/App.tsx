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

const App = () => {
    const [activeTab, setActiveTab] = useState(0)

    // method to switch to a tab from anywhere
    window.switchToTab = (index: number) => {
        setActiveTab(index)
    }

    const tabs = [
        { icon: mapImg, label: 'Carte', component: MapTab },
        { icon: attributesImg, label: 'Attributs', component: AttributesTab },
        { icon: identifyImg, label: 'Identifier', component: IdentifierTab },
        { icon: uploadImg, label: 'Envoi OSM', component: UploadTab }
    ]

    const renderActiveComponent = () => {
        const TabComponent = tabs[activeTab].component
        return (
            <TabComponent
                switchToMap={() => setActiveTab(0)}
                switchToAttributes={() => setActiveTab(1)}
                switchToIdentify={() => setActiveTab(2)}
                switchToSettings={() => setActiveTab(3)}
            />
        )
    }

    return (
        <div className="app">
            <main className="tab_content">
                {renderActiveComponent()}
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
    )
}

export default App

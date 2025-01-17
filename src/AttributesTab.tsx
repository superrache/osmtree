import { useContext } from 'react'
import './AttributesTab.css'
import { OSMConnectionContext, SelectedFeatureContext } from './contexts'

const AttributesTab = () => {
    const selectedFeature = useContext(SelectedFeatureContext)
    const osmConnection = useContext(OSMConnectionContext)

    const onDeleteTag = (key: string) => {
        if (selectedFeature.value) {
            let value = selectedFeature.value
            if (value.properties) {
                // delete the tag by key
                delete value.properties[key]
                // rebuild a new feature object to get re-rendering
                selectedFeature.setValue({
                    id: value.id,
                    type: value.type,
                    properties: value.properties,
                    geometry: value.geometry
                })
            }
        }
    }
    return (
        <div className="attributes_tab">
            <h2>Attributs</h2>
            <br/>
            {!osmConnection.value.connected && selectedFeature.value !== null && selectedFeature.value.properties && <div>
                <table>
                    <thead><tr><th>Clé</th><th>=</th><th>Valeur</th></tr></thead>
                    {Object.entries(selectedFeature.value.properties).map(([key, value]) => (
                        <tbody key={key}>
                            <tr>
                                <td>{key}</td>
                                <td>=</td>
                                <td>{value}</td>
                            </tr>
                        </tbody>
                    ))}
                </table>
                <span>Connecte-toi pour éditer les attributs</span>
            </div>}
            {osmConnection.value.connected && selectedFeature.value !== null && selectedFeature.value.properties && <div>
                <table>
                    <thead><tr><th>Clé</th><th>=</th><th>Valeur</th></tr></thead>
                    {Object.entries(selectedFeature.value.properties).map(([key, value]) => (
                        <tbody key={key}>
                            <tr>
                                <td><input type="search" value={key}/></td>
                                <td>=</td>
                                <td><input type="search" value={value}/></td>
                                <td><button onClick={() => onDeleteTag(key)}>x</button></td>
                            </tr>
                        </tbody>
                    ))}
                </table>
                <span>Connecte-toi pour éditer les attributs</span>
            </div>}
        </div>
    )
}

export default AttributesTab

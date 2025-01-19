import { useContext } from 'react'
import './AttributesTab.css'
import { OSMConnectionContext, SelectedFeatureContext } from './contexts'

const AttributesTab = () => {
    const selectedFeature = useContext(SelectedFeatureContext)
    const osmConnection = useContext(OSMConnectionContext)

    const onDeleteTag = (key: string) => {
        if (selectedFeature.value && key !== '' && key in selectedFeature.value.editingProperties) { // don't delete new key/value ''/''
            const feature = selectedFeature.value.feature
            const editingProperties = selectedFeature.value.editingProperties
            if (editingProperties[key].status in ['unmodified', 'modified']) {
                editingProperties[key].status = 'deleted'
            } else { // key was new
                delete feature.properties![key]
                delete editingProperties[key]
            }
            // rebuild a new feature object to get re-rendering
            selectedFeature.setValue({
                feature: {
                    id: feature.id,
                    type: feature.type,
                    properties: feature.properties,
                    geometry: feature.geometry
                },
                editingProperties: editingProperties
            })
        }
    }

    return (
        <div className="attributes_tab">
            <h2>Attributs</h2>
            <br/>
            {!osmConnection.value.connected && selectedFeature.value !== null && selectedFeature.value.feature.properties && <div>
                <table>
                    <thead><tr><th>Clé</th><th>=</th><th>Valeur</th></tr></thead>
                    {Object.entries(selectedFeature.value.feature.properties).map(([key, value]) => (
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
            {osmConnection.value.connected && selectedFeature.value !== null && <div>
                <table>
                    <thead><tr><th>Clé</th><th>=</th><th>Valeur</th></tr></thead>
                    {Object.entries(selectedFeature.value.editingProperties).map(([key, value]) => (
                        <tbody key={key}>
                            <tr className={`attribute_${selectedFeature.value!.editingProperties[key].status}`}>
                                <td><input type="search" value={key}/></td>
                                <td>=</td>
                                <td><input type="search" value={value.tagValue}/></td>
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

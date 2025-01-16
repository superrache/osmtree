import { useContext } from 'react'
import './AttributesTab.css'
import SelectedFeatureContext from './SelectedFeatureContext'

const AttributesTab = () => {
    const selectedFeature = useContext(SelectedFeatureContext)

    const onDeleteTag = (key: string) => {
        if (selectedFeature.value) {
            let value = selectedFeature.value
            if (value.properties) {
                delete value.properties[key]
                selectedFeature.setValue(value)
            }
        }
    }
    return (
        <div className="attributes_tab">
            <h2>Attributs</h2>
            <br/>
            {selectedFeature.value !== null && selectedFeature.value.properties && <table>
                <tr><th>Clé</th><th>=</th><th>Valeur</th></tr>
                {Object.entries(selectedFeature.value.properties).map(([key, value]) => (
                    <tr key={key}>
                        <td>{key}</td>
                        <td>=</td>
                        <td>{value}</td>
                        <button onClick={() => onDeleteTag(key)}>x</button>
                    </tr>
                ))}
            </table>}
        </div>
    )
}

export default AttributesTab

import { useContext } from 'react'
import './AttributesTab.css'
import { OSMConnectionContext, SelectedFeatureContext } from './contexts'
import AutocompleteInput from './AutocompleteInput'
import { EditingProperties } from './EditingProperties'

const AttributesTab = () => {
    const selectedFeature = useContext(SelectedFeatureContext)
    const osmConnection = useContext(OSMConnectionContext)

    const tagInfoInstance = 'https://taginfo.openstreetmap.org'

    const onDeleteTag = (key: string) => {
        if (selectedFeature.value && key !== '' && key in selectedFeature.value.editingProperties) { // don't delete new key/value ''/''
            selectedFeature.value.editingProperties.deleteKey(key)
            // rebuild a new feature object to get re-rendering
            selectedFeature.setValue({
                feature: selectedFeature.value!.feature,
                editingProperties: selectedFeature.value.editingProperties
            })
        }
    }

    const onInputKey = async (searchTerm: string, _: string | null) => {
        const url = `${tagInfoInstance}/api/4/keys/all?page=1&rp=10&sortname=count_all&sortorder=desc&query=${encodeURIComponent(searchTerm)}`
        const response = await fetch(url)
        const json = await response.json()
        const suggestions = []
        for(let d of json.data) {
          suggestions.push(d.key)
        }
        return suggestions
    }

    const onInputValue = async (searchTerm: string, key: string | null) => {
        const url = `${tagInfoInstance}/api/4/key/values?page=1&rp=10&sortname=count_all&sortorder=desc&key=${key}&query=${encodeURIComponent(searchTerm)}`
        const response = await fetch(url)
        const json = await response.json()
        const suggestions = []
        for(let d of json.data) {
          suggestions.push(d.value)
        }
        return suggestions
    }

    const onInputChange = (value: string, other: string | null, newVal: string) => {
        if (selectedFeature.value === null) return
        if (newVal === '') return // no change
        if (value === newVal) return // no change

        const isValue = other !== null // else is key

        console.log(`onInputChange ${isValue ? 'value' : 'key'} ${value} ${isValue ? other : ''} => ${newVal}`)

        let updateModel = false
        const editingProperties: EditingProperties = selectedFeature.value.editingProperties
        if (isValue) { // update a tag value
            if (value !== newVal) { // value changed
                // update the value
                editingProperties.modifyValue(other, newVal)
                // need update
                updateModel = true
            }
        } else { // value is a key
            if (value !== newVal && value in editingProperties) { // key changed
                editingProperties.modifyKey(value, newVal)
                updateModel = true
            }
        }
        if (updateModel) {
            selectedFeature.setValue({
                feature: selectedFeature.value!.feature,
                editingProperties: selectedFeature.value.editingProperties
            })
            // ajout d'une ligne vide à la fin si nécessaire
            //let last = this.editedProperties[this.editedProperties.length - 1]
            //if(last.key !== '' || last.value !== '') this.editedProperties.push({key: '', value: ''})
        }
    }

    return (
        <div className="attributes_tab">
            <h2>Attributs</h2>
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
                    {selectedFeature.value.editingProperties.getProps().map((prop, index) => (
                        <tbody key={index}>
                            <tr className={`attribute_${prop.status}`}>
                                <td><AutocompleteInput value={prop.key} other={null} suggestionsFunction={onInputKey} onValueChange={onInputChange}/></td>
                                <td>=</td>
                                <td><AutocompleteInput value={prop.tag} other={prop.key} suggestionsFunction={onInputValue} onValueChange={onInputChange}/></td>
                                <td><button onClick={() => onDeleteTag(prop.key)}>x</button></td>
                            </tr>
                        </tbody>
                    ))}
                </table>
                <div className="buttons">
                    <button>Valider</button>
                    <button>Annuler</button>
                </div>
            </div>}
        </div>
    )
}

export default AttributesTab

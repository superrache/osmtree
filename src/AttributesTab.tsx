import { useContext } from 'react'
import './AttributesTab.css'
import { OSMConnectionContext, SelectedFeatureContext } from './contexts'
import AutocompleteInput from './AutocompleteInput'
import { AttributesTabParams } from './types'
import { EditingProperties } from './EditingProperties'

// FIXME: bug: create an existing key with the last line
// FIXME: bug: delete a key then recreate it with the last line

const AttributesTab = ({onLocateFeature}: AttributesTabParams) => {
    const selectedFeature = useContext(SelectedFeatureContext)
    const osmConnection = useContext(OSMConnectionContext)

    const tagInfoInstance = 'https://taginfo.openstreetmap.org'

    const onDeleteTag = (key: string) => {
        if (selectedFeature.value && key !== '') { // don't delete new key/value ''/''
            selectedFeature.value.editingProperties.deleteKey(key)
            updateVueFromModel()
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
        // console.log('OnInputValue', searchTerm, key)
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

        // console.log(`onInputChange ${isValue ? 'value' : 'key'} ${value} ${isValue ? other : ''} => ${newVal}`)

        let updateModel = false
        if (isValue) { // update a tag value
            if (value !== newVal) { // value changed
                // update the value
                selectedFeature.value.editingProperties.modifyValue(other, newVal)
                // need update
                updateModel = true
            }
        } else { // value is a key
            if (value !== newVal) { // key changed
                selectedFeature.value.editingProperties.modifyKey(value, newVal)
                updateModel = true
            }
        }
        if (updateModel) {
            updateVueFromModel()
        }
    }

    const updateVueFromModel = () => {
        if (selectedFeature.value) {
            selectedFeature.setValue({
                feature: selectedFeature.value.feature,
                editingProperties: selectedFeature.value!.editingProperties
            })
        }
    }

    const onCancel = () => {
        if (selectedFeature.value !== null) {
            const resetEditingProperties = new EditingProperties(selectedFeature.value.feature)
            selectedFeature.setValue({
                feature: selectedFeature.value.feature,
                editingProperties: resetEditingProperties
            })
        }
    }

    const onValidate = () => {

    }

    return (
        <div className="attributes_tab">
            <h2>Attributs</h2>
            {!osmConnection.value.auth.authenticated() && selectedFeature.value && selectedFeature.value.feature && selectedFeature.value.feature.properties && <div>
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
            {osmConnection.value.auth.authenticated() && selectedFeature.value !== null && <div>
                <table>
                    <thead><tr><th>Clé</th><th>=</th><th>Valeur</th></tr></thead>
                    {selectedFeature.value && selectedFeature.value.editingProperties.getProps().map((prop, index) => (
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
                {selectedFeature.value.feature.geometry.type === 'Point' && selectedFeature.value.feature.geometry.coordinates[0] === 0 && <div>Cet élément n'a pas de position géographique. <button onClick={onLocateFeature}>Positionner</button></div>}
                <div className="buttons">
                    <button onClick={onValidate}>Valider</button>
                    <button onClick={onCancel}>Annuler</button>
                </div>
            </div>}
        </div>
    )
}

export default AttributesTab

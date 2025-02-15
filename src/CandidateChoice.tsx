import { CandidateChoiceParams, PlantNetCandidate } from './types'
import './CandidateChoice.css'
import { useContext } from 'react'
import { SelectedFeatureContext } from './contexts'
import { EditingProperties } from './EditingProperties'
import { rgbaToHex } from './utils'

const CandidateChoice = ({candidates, setCandidates, localizedSpeciesKey, naturalType, denotationType}: CandidateChoiceParams) => {
    const selectedFeature = useContext(SelectedFeatureContext)
  
    if (candidates.length === 0) {
        return null
    }

    // TODO: move this function in IdentifierTab
    const getOrCreateSelectedFeature = () => {
        if (selectedFeature.value) {
            selectedFeature.value.editingProperties.modifyValue('natural', naturalType)
            if (naturalType === 'tree' && denotationType !== 'no') {
                selectedFeature.value.editingProperties.modifyValue('denotation', denotationType)
            } else {
                selectedFeature.value.editingProperties.deleteKey('denotation')
            }
            return selectedFeature.value
        }

        const newFeature: GeoJSON.Feature = {
            id: selectedFeature.getNewId(),
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [0, 0]
            },
            properties: {
                natural: naturalType
            }
        }
        const newEditingProperties = new EditingProperties(newFeature)
        if (naturalType === 'tree' && denotationType !== 'no') {
            newEditingProperties.modifyValue('denotation', denotationType)
        }
        return {
            feature: newFeature,
            editingProperties: newEditingProperties
        }
    }

    const onResultSelect = (index: number) => {
        // console.log('onResultSelect', index)
        const newCandidates: PlantNetCandidate[] = [] // for re-rendering
        candidates.forEach((candidate, idx) => {
            candidate.selected = (index === idx)
            newCandidates.push(candidate)
            if (candidate.selected) {
                // get the selected feature or create one
                const sf = getOrCreateSelectedFeature()
                // modify properties
                if (candidate.localizedSpecies) sf.editingProperties.modifyValue(localizedSpeciesKey, candidate.localizedSpecies)
                if (candidate.genus) sf.editingProperties.modifyValue('genus', candidate.genus)
                if (candidate.species) sf.editingProperties.modifyValue('species', candidate.species)
                sf.editingProperties.modifyValue('survey:date', new Date().toISOString().split('T')[0])

                // set the value to update in every component
                selectedFeature.setValue({
                    feature: sf.feature,
                    editingProperties: sf.editingProperties
                })
            }
        })
        setCandidates(newCandidates)
    }

    return (
        <div className="results">
            {candidates.map((candidate, index) => (
                <div className={`result ${candidate.selected ? 'result_selected' : ''}`}
                    key={index}
                    onClick={() => onResultSelect(index)}>
                    <img className="result-image" v-if="result.imageUrl !== ''" src={candidate.imageUrl}/>
                    <div className="result-info" style={{backgroundColor: rgbaToHex(Math.round(255 * (1 - candidate.score)), Math.round(255 * candidate.score), 0, 120)}}>
                        <div className="result-label-title">{ `${localizedSpeciesKey}=${candidate.localizedSpecies}` }</div>
                        <div>{ `genus=${candidate.genus}` }</div>
                        <div>{ `species=${candidate.species}` }</div>
                        <div className='score'>
                            { `fiabilité: ${(Math.round(candidate.score * 1000) / 10)}%` }
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default CandidateChoice

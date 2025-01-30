import { CandidateChoiceParams, PlantNetCandidate } from './types'
import './CandidateChoice.css'
import { useContext } from 'react'
import { SelectedFeatureContext } from './contexts'
import { EditingProperties } from './EditingProperties'

const CandidateChoice = ({candidates, setCandidates, localizedSpeciesKey, naturalType}: CandidateChoiceParams) => {
    const selectedFeature = useContext(SelectedFeatureContext)
  
    if (candidates.length === 0) {
        return null
    }

    const getOrCreateSelectedFeature = () => {
        if (selectedFeature.value) return selectedFeature.value

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
        return {
            feature: newFeature,
            marker: null,
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
                sf.editingProperties.modifyValue('natural', naturalType)
                if (candidate.localizedSpecies) sf.editingProperties.modifyValue(localizedSpeciesKey, candidate.localizedSpecies)
                if (candidate.genus) sf.editingProperties.modifyValue('genus', candidate.genus)
                if (candidate.species) sf.editingProperties.modifyValue('species', candidate.species)
                sf.editingProperties.modifyValue('survey:date', new Date().toISOString().split('T')[0])

                // set the value to update in every components
                selectedFeature.setValue(sf)
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
                    <div className="result-info">
                        <div className="result-label-title">{ `${localizedSpeciesKey}=${candidate.localizedSpecies}` }</div>
                        <div>{ `genus=${candidate.genus}` }</div>
                        <div>{ `species=${candidate.species}` }</div>
                        <div>{ `score: ${(Math.round(candidate.score * 1000) / 10)}%` }</div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default CandidateChoice

import { CandidateChoiceParams, PlantNetCandidate } from './types'
import './CandidateChoice.css'
import { useContext } from 'react'
import { SelectedFeatureContext } from './contexts'



const CandidateChoice = ({candidates, setCandidates, localizedSpeciesKey}: CandidateChoiceParams) => {
  const selectedFeature = useContext(SelectedFeatureContext)
  
  if (candidates.length === 0) {
    return null
  }

  const onResultSelect = (e: any, index: number) => {
    console.log('onResultSelect', index)
    const newCandidates: PlantNetCandidate[] = [] // for re-rendering
    candidates.forEach((candidate, idx) => {
      candidate.selected = (index === idx)
      newCandidates.push(candidate)
      if (candidate.selected) {
        // get the selected feature or create one
        const feature = selectedFeature.value ?? {
          id: -1,
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [0, 0]
          },
          properties: {
            natural: 'tree'
          }
        }
        // modify properties
        if (feature.properties) {
          if (candidate.localizedSpecies) feature.properties[localizedSpeciesKey] = candidate.localizedSpecies
          if (candidate.genus) feature.properties['genus'] = candidate.genus
          if (candidate.species) feature.properties['species'] = candidate.species
        }

        // set the value to update in every components
        selectedFeature.setValue(feature)
      }
    })
    setCandidates(newCandidates)
  }

  return (
    <div className="results">
      {candidates.map((candidate, index) => (
        <div className={`result ${candidate.selected ? 'result_selected' : ''}`}
          key={index}
          onClick={(e) => onResultSelect(e, index)}>
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

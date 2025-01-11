import { CandidateChoiceParams, PlantNetCandidate } from './types'
import './CandidateChoice.css'



const CandidateChoice = ({candidates, localizedSpeciesKey}: CandidateChoiceParams) => {
  if (candidates.length === 0) {
    return null
  }
  
  const onResultSelect = (e: any, index: number) => {
    console.log('onResultSelect', index)
    candidates.forEach((candidate, idx) => {
      candidate.selected = (index === idx)
      //if (candidate.selected) {
        // TODO: set properties to osm feature
      //}
    })
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

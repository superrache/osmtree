import { CandidateChoiceParams } from './types'
import './CandidateChoice.css'



const CandidateChoice = ({candidates, localizedSpeciesKey}: CandidateChoiceParams) => {
  if (candidates.length === 0) {
    return null
  }
  
  const onResultSelect = (e: any, index: number) => {
    console.log('onResultSelect', index)
  }

  return (
    <div className="results">
      {candidates.map((candidate, index) => (
        <div className="result"
          key={index}
          onClick={(e) => onResultSelect(e, index)}>
          <img className="result-image" v-if="result.imageUrl !== ''" src={candidate.imageUrl}/>
          <div className="result-info">
            <div className="result-label-title">{ `${localizedSpeciesKey}=${candidate.localizedSpecies}` }</div>
            <div>{ `genus=${candidate.genus}` }</div>
            <div>{ `species=${candidate.species}` }</div>
            <div>{ `score: ${(candidate.score * 100)}%` }</div>
          </div>
        </div>
      ))}
    </div>
  )
}

//className={ result_selected: candidate.selected }

        

export default CandidateChoice

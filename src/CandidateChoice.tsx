import { CandidateChoiceParams, PlantNetCandidate } from './types'
import './CandidateChoice.css'
import { rgbaToHex } from './utils'

const CandidateChoice = ({candidates, setCandidates, localizedSpeciesKey, handleSelectCandidate}: CandidateChoiceParams) => {  
    if (candidates.length === 0) {
        return null
    }

    const onResultSelect = (index: number) => {
        // console.log('onResultSelect', index)
        const newCandidates: PlantNetCandidate[] = [] // for re-rendering
        candidates.forEach((candidate, idx) => {
            candidate.selected = (index === idx)
            newCandidates.push(candidate)
            if (candidate.selected) {
                const props: Record<string, string> = {}
                // modify properties
                if (candidate.localizedSpecies) props[localizedSpeciesKey] = candidate.localizedSpecies
                if (candidate.genus) props['genus'] = candidate.genus
                if (candidate.species) props['species'] = candidate.species
                props['survey:date'] = new Date().toISOString().split('T')[0]
                handleSelectCandidate(props)
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

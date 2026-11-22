import { CandidateChoiceParams, PlantNetCandidate } from './types'
import './CandidateChoice.css'
import { rgbaToHex } from './utils'
import { getWikidataFromGbif } from './wikidata'

const CandidateChoice = ({candidates, setCandidates, localizedSpeciesKey, handleSelectCandidate}: CandidateChoiceParams) => {  
    if (candidates.length === 0) {
        return null
    }

    const onResultSelect = async (index: number) => {
        // show the selection right away
        const newCandidates: PlantNetCandidate[] = [] // for re-rendering
        candidates.forEach((candidate, idx) => {
            candidate.selected = (index === idx)
            newCandidates.push(candidate)
        })
        setCandidates(newCandidates)

        const candidate = candidates[index]
        const props: Record<string, string> = {}
        if (candidate.localizedSpecies) props[localizedSpeciesKey] = candidate.localizedSpecies
        if (candidate.genus) props['genus'] = candidate.genus
        if (candidate.species) props['species'] = candidate.species
        // Wikidata item of the species (left out if not found: IdentifierTab drops an outdated one)
        const wikidata = (candidate.species && candidate.gbifId) ? await getWikidataFromGbif(candidate.gbifId) : undefined
        if (wikidata !== undefined) props['species:wikidata'] = wikidata
        props['check_date'] = new Date().toISOString().split('T')[0]

        // another candidate chosen during the Wikidata lookup: it wins
        if (!candidate.selected) return
        handleSelectCandidate(props)
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

import { useContext, useEffect, useState } from 'react'
import './IdentifierTab.css'
import PlantNetIdentifyForm from './PlantNetIdentifyForm'
import { PlantNetIdentifyParams, PlantNetCandidate } from './types'
import CandidateChoice from './CandidateChoice'
import { getApiUrl } from './utils'
import { SelectedFeatureContext } from './contexts'
import { denotationTypes, naturalTypes } from './consts'

const IdentifierTab = () => {
    const maxResults = 12

    const selectedFeature = useContext(SelectedFeatureContext)

    const [localizedSpeciesKey, setLocalizedSpeciesKey] = useState<string>('species:en')
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [candidates, setCandidates] = useState<PlantNetCandidate[]>([])
    const [naturalType, setNaturalType] = useState<string>(Object.keys(naturalTypes)[0])
    const [denotationType, setDenotationType] = useState<string>(Object.keys(denotationTypes)[0])

    useEffect(() => {
        if (selectedFeature.value && selectedFeature.value.feature && selectedFeature.value.feature.properties) {
            setNaturalType(selectedFeature.value.feature.properties['natural']) // natural is required TODO: or from editingProperties
            if (selectedFeature.value.feature.properties['denotation']) // denotation is optional
                setDenotationType(selectedFeature.value.feature.properties['denotation']) // TODO: or from editingProperties
        } // else (no selection) let the last natural type selected
    }, [selectedFeature.value])

    const handleIdentify = async (params: PlantNetIdentifyParams) => {
        setIsLoading(true)
        setCandidates([])
        setNaturalType(naturalType) // TODO: remove?
        setDenotationType(denotationType) // TODO: remove?
        try {
            // save current language to save result in the good osm key
            const lang = 'fr' // TODO: get user lang
            setLocalizedSpeciesKey(`species:${lang}`)

            const form = new FormData()
            form.append('organs', params.organ) // only one, TODO: could be several
            form.append('image', params.pictureFile)
            form.append('lang', lang)

            const response = await fetch(getApiUrl('plantnet-identify'), {
                method: 'post',
                body: form
            })
            const data = await response.json()

            const tmpCandidates: PlantNetCandidate[] = []
            for(const res of data.results) {
                if(tmpCandidates.length > maxResults) break
                let localizedSpecies = ''
                let genus = ''
                let speciesScientificName = ''
                if('species' in res) {
                    let species = res['species']
                    if('commonNames' in species && species['commonNames'].length > 0) localizedSpecies = species['commonNames'][0]
                    if('genus' in species && 'scientificNameWithoutAuthor' in species['genus']) genus = species['genus']['scientificNameWithoutAuthor']
                    if('scientificNameWithoutAuthor' in species) speciesScientificName = species['scientificNameWithoutAuthor']
                }

                const candidate: PlantNetCandidate = {
                    imageUrl: res.images.length > 0 && res.images[0].url.m !== undefined ? res.images[0].url.m : '',
                    genus: genus,
                    localizedSpecies: localizedSpecies,
                    score: res['score'],
                    species: speciesScientificName,
                    selected: false
                }

                /* TODO: how to get these info from plantnet?
                this.editedProperties['leaf_cycle'] = ''
                this.editedProperties['leaf_type'] = ''*/

                tmpCandidates.push(candidate)
            }
            // apply candidates to CandidateChoice
            setCandidates(tmpCandidates)
        } catch (error) {
            console.error('Identify error', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className='identifier_tab'>
            {selectedFeature.value && selectedFeature.value.feature && selectedFeature.value.feature.properties && <div className='identifier_group identifier_selection_info'>
                <span className='species_name'>{selectedFeature.value.feature.properties.hasOwnProperty('species:fr') ? 
                    selectedFeature.value.feature.properties['species:fr'] 
                    : (selectedFeature.value.feature.properties.hasOwnProperty('species') ? 
                    selectedFeature.value.feature.properties['species'] : 'inconnu')}</span>
                <br/>
                <span>{naturalTypes[selectedFeature.value.feature.properties['natural']].label}</span>
            </div>}
            <div className="identifier_group">
                Type principal
                <div className="things">
                    {Object.entries(naturalTypes).map(([tag, nt]) => {
                        return (
                            <div className="thing" key={tag}
                                style={{opacity: tag === naturalType ? 1 : 0.5}}
                                onClick={() => setNaturalType(tag)}>
                                <img src={nt.icon} width='50' />
                                {nt.label}
                            </div>
                        )
                    })}
                </div>
            </div>

            { naturalType === 'tree' && <div className="identifier_group">
                Dénotation
                <div className="things">
                    {Object.entries(denotationTypes).map(([tag, nt]) => {
                        return (
                            <div className="thing" key={tag}
                                style={{opacity: tag === denotationType ? 1 : 0.5}}
                                onClick={() => setDenotationType(tag)}>
                                <img src={nt.icon} width='50' />
                                {nt.label}
                            </div>
                        )
                    })}
                </div>
            </div>}

            <div className="identifier_group">
                Identification Pl@ntNet
                <PlantNetIdentifyForm onIdentify={handleIdentify} isLoading={isLoading}/>

                { isLoading && <div>Identification en cours...</div>}

                <CandidateChoice
                    candidates={candidates}
                    setCandidates={setCandidates}
                    localizedSpeciesKey={localizedSpeciesKey}
                    naturalType={naturalType}
                    denotationType={denotationType} />
            </div>
        </div>
    )
}

export default IdentifierTab    

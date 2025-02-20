import { useContext, useEffect, useState } from 'react'
import './IdentifierTab.css'
import PlantNetIdentifyForm from './PlantNetIdentifyForm'
import { PlantNetIdentifyParams, PlantNetCandidate, OverpassFeature } from './types'
import CandidateChoice from './CandidateChoice'
import { getApiUrl } from './utils'
import { SelectedFeatureContext } from './contexts'
import { combinations, naturalTypes } from './consts'
import { EditingProperties } from './EditingProperties'

const IdentifierTab = () => {
    const maxResults = 12

    const selectedFeature = useContext(SelectedFeatureContext)

    const [localizedSpeciesKey, setLocalizedSpeciesKey] = useState<string>('species:en')
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [candidates, setCandidates] = useState<PlantNetCandidate[]>([])
    const [naturalType, setNaturalType] = useState<string>(Object.keys(naturalTypes)[0])
    const [selectedCombinations, setSelectedCombinations] = useState<Record<string, string>>({})

    useEffect(() => {
        if (selectedFeature.value !== null) {
            const natType = selectedFeature.value.feature.properties['natural'] // natural is required
            // select the natural type
            setNaturalType(natType)
            // update combinations types from selected feature editing properties
            const newSelectedCombinations: Record<string, string> = {}
            for (const [key, combination] of Object.entries(combinations)) {
                if (combination.natural.includes(natType)) {
                    newSelectedCombinations[key] = Object.keys(combination.values)[0] // none
                    const val = selectedFeature.value.editingProperties.getValue(key)
                    if (val && val in combination.values) newSelectedCombinations[key] = val
                }
            }
            setSelectedCombinations(newSelectedCombinations)
        } else { // else (no selection) let the last natural type selected
            const newSelectedCombinations: Record<string, string> = {}
            for (const [key, combination] of Object.entries(combinations)) {
                if (combination.natural.includes(naturalType)) {
                    newSelectedCombinations[key] = Object.keys(combination.values)[0] // none
                }
            }
            setSelectedCombinations(newSelectedCombinations)
        }
    }, [selectedFeature.value])

    useEffect(() => {
        if (selectedFeature.value !== null) {
            const editingProperties = selectedFeature.value.editingProperties
            const oldProps = structuredClone(editingProperties.props)
            for (const [key, tag] of Object.entries(selectedCombinations)) {
                if (tag === 'none') editingProperties.deleteKey(key)
                else editingProperties.modifyValue(key, tag)
            }
            if (JSON.stringify(editingProperties.props) !== JSON.stringify(oldProps)) { // props modified? need update
                selectedFeature.setValue({
                    feature: selectedFeature.value.feature,
                    editingProperties: editingProperties
                })
            }
        }
    }, [selectedCombinations])

    useEffect(() => {
        if (selectedFeature.value !== null && naturalType !== selectedFeature.value.feature.properties.natural) {
            // update marker, properties and editingProperties
            const feature = selectedFeature.value.feature
            feature.properties['natural'] = naturalType
            const editingProperties = selectedFeature.value.editingProperties
            editingProperties.modifyValue('natural', naturalType)
            selectedFeature.setValue({
                feature: feature, // triggers an update of the marker
                editingProperties: editingProperties
            })
        }
    }, [naturalType])

    const handleIdentify = async (params: PlantNetIdentifyParams) => {
        setIsLoading(true)
        setCandidates([])
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

    const getOrCreateSelectedFeature = () => {
        if (selectedFeature.value !== null) return selectedFeature.value

        const newFeature: OverpassFeature = {
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
            editingProperties: newEditingProperties
        }
    }

    const handleSelectCandidate = (props: Record<string, string>) => {
        // get the selected feature or create one
        const sf = getOrCreateSelectedFeature()

        // update from type selectors
        sf.editingProperties.modifyValue('natural', naturalType)
        for (const combination of Object.values(combinations)) {
            if (combination.natural.includes(naturalType)) {
                sf.editingProperties.modifyValue(combination.key, selectedCombinations[combination.key])
            } else {
                sf.editingProperties.deleteKey(combination.key)
            }
        }

        // update from candidates props
        for (const [key, tag] of Object.entries(props)) {
            sf.editingProperties.modifyValue(key, tag)
        }

        // set the value to update in every component
        selectedFeature.setValue({
            feature: sf.feature,
            editingProperties: sf.editingProperties
        })
    }

    return (
        <div className='identifier_tab'>
            {selectedFeature.value !== null && <div className='identifier_group identifier_selection_info'>
                <span className='species_name'>{selectedFeature.value.feature.properties.hasOwnProperty('species:fr') ? 
                    selectedFeature.value.feature.properties['species:fr'] 
                    : (selectedFeature.value.feature.properties.hasOwnProperty('species') ? 
                    selectedFeature.value.feature.properties['species'] : 'inconnu')}</span>
                <br/>
                <span>{naturalTypes[selectedFeature.value.feature.properties['natural']].label}</span>
                <br/>
                <span>{naturalType}</span>
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

            { Object.entries(combinations).map(([key, combination]) => {
                return (
                    combination.natural.includes(naturalType) && <div className="identifier_group">
                        {combination.label}
                        <div className='things' key={key}>
                            {Object.entries(combination.values).map(([tag, cbVal]) => {
                                return (
                                    <div className="thing" key={tag}
                                        style={{opacity: key in selectedCombinations && tag === selectedCombinations[key] ? 1 : 0.5}}
                                        onClick={() => {
                                            const selectedCombinationsCopy = structuredClone(selectedCombinations)
                                            selectedCombinationsCopy[key] = tag
                                            setSelectedCombinations(selectedCombinationsCopy)
                                        }}>
                                        <img src={cbVal.icon} width='50' />
                                        {cbVal.label}
                                    </div>
                                )
                            })}
                        </div>
                    </div>)
            })}

            <div className="identifier_group">
                Identification Pl@ntNet
                <PlantNetIdentifyForm onIdentify={handleIdentify} isLoading={isLoading}/>

                { isLoading && <div>Identification en cours...</div>}

                <CandidateChoice
                    candidates={candidates}
                    setCandidates={setCandidates}
                    localizedSpeciesKey={localizedSpeciesKey}
                    handleSelectCandidate={handleSelectCandidate} />
            </div>
            <br/>
            <br/>
            <br/>
            <br/>
            <br/>
            osmtree
            <br/>
            <br/>
            <br/>
            <br/>
            <br/>
        </div>
    )
}

export default IdentifierTab    

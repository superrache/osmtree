import { useContext, useState } from 'react'
import './IdentifierTab.css'
import PlantNetIdentifyForm from './PlantNetIdentifyForm'
import { PlantNetIdentifyParams, PlantNetCandidate, OverpassFeature } from './types'
import CandidateChoice from './CandidateChoice'
import { getApiUrl, getNatural, getNaturalLabel, getSpeciesName } from './utils'
import { SelectedFeatureContext } from './contexts'
import { combinations, naturalTypes } from './consts'
import { EditingProperties } from './EditingProperties'
import { lang, localizedSpeciesKey, t } from './i18n'

const IdentifierTab = () => {
    const maxResults = 12

    const selectedFeature = useContext(SelectedFeatureContext)

    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [identifyError, setIdentifyError] = useState<boolean>(false)
    const [candidates, setCandidates] = useState<PlantNetCandidate[]>([])
    // type and combinations chosen without selection (applied to a feature created by an identification)
    const [lastNaturalType, setLastNaturalType] = useState<string>(Object.keys(naturalTypes)[0])
    const [selectedCombinations, setSelectedCombinations] = useState<Record<string, string>>({})

    // adjusted during render when the selection changes (no effect: see "you might not need an effect")
    const selectedNatural = selectedFeature.value !== null ? getNatural(selectedFeature.value) : undefined
    if (selectedNatural !== undefined && selectedNatural !== lastNaturalType) {
        setLastNaturalType(selectedNatural) // kept after unselecting, as the default type
    }
    const [prevSelection, setPrevSelection] = useState(selectedFeature.value)
    if (selectedFeature.value !== prevSelection) {
        setPrevSelection(selectedFeature.value)
        setSelectedCombinations({}) // back to "none" once unselected
    }

    const naturalType = selectedNatural ?? lastNaturalType

    // displayed combinations: from the selected feature tags, else from the user's choices
    const displayedCombinations: Record<string, string> = {}
    for (const [key, combination] of Object.entries(combinations)) {
        if (combination.natural.includes(naturalType)) {
            // display only: a value unknown to the assistant (e.g. leaf_type=mixed) highlights nothing
            const val = selectedFeature.value !== null ?
                selectedFeature.value.editingProperties.getValue(key) :
                selectedCombinations[key]
            displayedCombinations[key] = val || Object.keys(combination.values)[0] // none
        }
    }

    // a type clicked by the user: written to the selected feature
    const onNaturalTypeClick = (tag: string) => {
        setLastNaturalType(tag)
        if (selectedFeature.value !== null && tag !== getNatural(selectedFeature.value)) {
            // only the editing properties change: feature.properties keeps the original OSM tags (needed by Cancel)
            const editingProperties = selectedFeature.value.editingProperties
            editingProperties.modifyValue('natural', tag)
            selectedFeature.setValue({
                feature: selectedFeature.value.feature, // triggers an update of the marker
                editingProperties: editingProperties
            })
        }
    }

    // a combination clicked by the user: the only place where the assistant writes these tags
    // (no effect: an effect also ran when the tags were edited in AttributesTab and removed them)
    const onCombinationClick = (key: string, tag: string) => {
        setSelectedCombinations({...selectedCombinations, [key]: tag})
        if (selectedFeature.value !== null) {
            const editingProperties = selectedFeature.value.editingProperties
            if (tag === 'none') editingProperties.deleteKey(key)
            else editingProperties.modifyValue(key, tag)
            selectedFeature.setValue({
                feature: selectedFeature.value.feature,
                editingProperties: editingProperties
            })
        }
    }

    const handleIdentify = async (params: PlantNetIdentifyParams) => {
        setIsLoading(true)
        setIdentifyError(false)
        setCandidates([])
        try {
            // common names in the user's language, written to species:<lang>
            const form = new FormData()
            form.append('organs', params.organ) // only one, TODO: could be several
            form.append('image', params.pictureFile)
            form.append('lang', lang)

            const response = await fetch(getApiUrl('plantnet-identify'), {
                method: 'post',
                body: form
            })
            const data = await response.json()
            // the Worker answers {error: 20|21|22} with HTTP 200
            if (!response.ok || !Array.isArray(data?.results)) throw new Error(`identification failed: ${JSON.stringify(data)}`)

            const tmpCandidates: PlantNetCandidate[] = []
            for(const res of data.results) {
                if(tmpCandidates.length > maxResults) break
                let localizedSpecies = ''
                let genus = ''
                let speciesScientificName = ''
                if('species' in res) {
                    const species = res['species']
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
                    gbifId: res.gbif?.id !== undefined ? String(res.gbif.id) : '',
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
            setIdentifyError(true)
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
        // (already applied on click to a selected feature; needed when the feature is created here)
        for (const [key, tag] of Object.entries(displayedCombinations)) {
            if (tag !== 'none' && key in combinations && combinations[key].values[tag] !== undefined) {
                sf.editingProperties.modifyValue(key, tag)
            }
        }

        // species:wikidata of another species is outdated (read before updating species)
        const speciesChanged = props['species'] !== undefined && props['species'] !== sf.editingProperties.getValue('species')
        if (speciesChanged && props['species:wikidata'] === undefined) sf.editingProperties.deleteKey('species:wikidata')

        // update from candidates props
        for (const [key, tag] of Object.entries(props)) {
            sf.editingProperties.modifyValue(key, tag)
        }
        // check_date replaces the discouraged survey:date
        if (props['check_date'] !== undefined) sf.editingProperties.deleteKey('survey:date')

        // set the value to update in every component
        selectedFeature.setValue({
            feature: sf.feature,
            editingProperties: sf.editingProperties
        })
    }

    return (
        <div className='identifier_tab'>
            {selectedFeature.value !== null && <div className='identifier_group identifier_selection_info'>
                <span className='species_name'>{getSpeciesName(selectedFeature.value.feature.properties)}</span>
                <br/>
                <span>{getNaturalLabel(getNatural(selectedFeature.value))}</span>
                <br/>
                <span>{naturalType}</span>
            </div>}
            <div className="identifier_group">
                {t('identify.naturalType')}
                <div className="things">
                    {Object.entries(naturalTypes).map(([tag, nt]) => {
                        return (
                            <div className="thing" key={tag}
                                style={{opacity: tag === naturalType ? 1 : 0.5}}
                                onClick={() => onNaturalTypeClick(tag)}>
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
                                        style={{opacity: tag === displayedCombinations[key] ? 1 : 0.5}}
                                        onClick={() => onCombinationClick(key, tag)}>
                                        <img src={cbVal.icon} width='50' />
                                        {cbVal.label}
                                    </div>
                                )
                            })}
                        </div>
                    </div>)
            })}

            <div className="identifier_group">
                {t('identify.plantnet')}
                <PlantNetIdentifyForm onIdentify={handleIdentify} isLoading={isLoading}/>

                { isLoading && <div>{t('identify.inProgress')}</div>}
                { identifyError && <div>{t('identify.error')}</div>}

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

import { useState } from 'react'
import './IdentifierTab.css'
import IdentifyForm from './IdentifyForm'
import { IdentifyParams, PlantNetCandidate } from './types'
import CandidateChoice from './CandidateChoice'
import { getApiUrl } from './utils'

const IdentifierTab = () => {
  const maxResults = 12

  const [localizedSpeciesKey, setLocalizedSpeciesKey] = useState<string>('species:en')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [candidates, setCandidates] = useState<PlantNetCandidate[]>([])

  const handleIdentify = async (params: IdentifyParams) => {
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

  return (
    <div className='identifier_tab'>
      <IdentifyForm onIdentify={handleIdentify} isLoading={isLoading}/>

      { isLoading && <div>Identification en cours...</div>}

      <CandidateChoice candidates={candidates} setCandidates={setCandidates} localizedSpeciesKey={localizedSpeciesKey} />
    </div>
  )
}

export default IdentifierTab  

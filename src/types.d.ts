export type Organ = {
    id: string
    selected: boolean
    icon: string
  }
  
export type IdentifyParams = {
    pictureFile: File
    organ: string
}

export type IdentifyFormProps = {
    onIdentify: (params: IdentifyParams) => void
    isLoading: boolean
}

export type PlantNetCandidate = {
    imageUrl: string
    score: number
    genus: string
    species: string
    localizedSpecies: string
}

export type CandidateChoiceParams = {
    candidates: PlantNetCandidate[]
    localizedSpeciesKey: string
}
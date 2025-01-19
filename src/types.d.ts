import { Feature, Marker, MarkerOptions } from "maplibre-gl"
import { EditingProperties } from "./EditingProperties"

export type DataResponse = {
    codename?: string
    error?: number
    message?: string
    type?: 'FeatureCollection'
    features?: GeoJSON.Feature[]
}

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
    selected: boolean
}

export type CandidateChoiceParams = {
    candidates: PlantNetCandidate[]
    setCandidates: (candidates: PlantNetCandidate[]) => void
    localizedSpeciesKey: string
}

export type TreeMarkerStyle = {
    icon: string
    color: string
}

export type SelectedFeature = {
    feature: GeoJSON.Feature
    editingProperties: EditingProperties
} | null

export type SelectedFeatureContextValue = {
    value: SelectedFeature,
    setValue: (value: SelectedFeature) => void
}

export type OSMConnection = {
    connected: boolean
    userName: string
}

export type OSMConnectionContextValue = {
    value: OSMConnection,
    setValue: (value: OSMConnection) => void
}
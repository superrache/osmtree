import { Feature } from "maplibre-gl"
import { EditingProperties } from "./EditingProperties"
import { FeatureMarker } from "./FeatureMarker"
import { Ref } from "react"

export type DataResponse = {
    codename?: string
    error?: number
    message?: string
    type?: 'FeatureCollection'
    features?: GeoJSON.Feature[]
}

export type Organ = {
    selected: boolean
    icon: string
    label: string
  }
  
export type IdentifyParams = {
    pictureFile: File
    organ: string
    naturalType: string
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
    naturalType: string
}

export type AttributesTabParams = {
    onLocateFeature: () => void
}

export type MapTabParams = {
    mapTabRef: React.MutableRefObject<(() => void) | undefined>
}

export type NaturalType = {
    icon: string
    color: string
    label: string
    selected: boolean
}

export type SelectedFeature = {
    feature: GeoJSON.Feature
    marker: FeatureMarker | null
    editingProperties: EditingProperties
} | null

export type SelectedFeatureContextValue = {
    value: SelectedFeature
    setValue: (value: SelectedFeature) => void
    getNewId: () => number
}

export type MapContextValue = {
    bounds: string
    setBounds: (bounds: string) => void
}

export type OSMConnection = {
    connected: boolean
    userName: string
}

export type OSMConnectionContextValue = {
    value: OSMConnection,
    setValue: (value: OSMConnection) => void
}

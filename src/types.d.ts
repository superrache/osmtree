import { Feature } from "maplibre-gl"
import { EditingProperties } from "./EditingProperties"
import { FeatureMarker } from "./FeatureMarker"
import { Ref } from "react"

export type Tab = {
    icon: string
    label: string
    notificationCount: number
    content: Component
}
export type DataResponse = {
    codename?: string
    error?: number
    message?: string
    type?: 'FeatureCollection'
    features?: GeoJSON.Feature[]
}

export type Organ = {
    icon: string
    label: string
  }
  
export type PlantNetIdentifyParams = {
    pictureFile: File
    organ: string
}

export type PlantNetIdentifyFormProps = {
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
    denotationType: string
}

export type AttributesTabParams = {
    onLocateFeature: () => void
}

export type UploadTabParams = {
    osmLogin: () => void
    osmLogout: () => void
}

export type MapTabParams = {
    mapTabRef: React.RefObject<(() => void) | undefined>
}

export type NaturalType = {
    icon: string
    color: string
    label: string
}

export type DenotationType = {
    icon: string
    label: string
}

export type OverpassFeature = {
    type: "Feature";
    id: number // difference with maplibregl GeoJSON.Feature string | number | undefined
    geometry: GeoJSON.Point // always type Point
    properties: Record<string, string>
}

export type OverpassFeatureCollection = {
    type: 'FeatureCollection'
    features: OverpassFeature[]
}

export type EditableFeature = {
    feature: OverpassFeature
    editingProperties: EditingProperties
}

export type SelectedFeature = EditableFeature | null

export type SelectedFeatureContextValue = {
    value: SelectedFeature
    setValue: (value: SelectedFeature) => void
    getNewId: () => number
}

export type FeatureMarkersValue = {
    value: Record<number, FeatureMarker>
    setValue: (_: Record<number, FeatureMarker>) => void
}

export type MapContextValue = {
    bounds: string
    setBounds: (bounds: string) => void
}

export type OSMConnection = {
    userName: string
    auth: any | null
    osmRequest: any | null
    editedFeatures: Record<number, EditableFeature>
}

export type OSMConnectionContextValue = {
    value: OSMConnection,
    setValue: (value: OSMConnection) => void
}

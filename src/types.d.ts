import type { Feature as GeoJSONFeature, Point } from "geojson"
import { EditingProperties } from "./EditingProperties"
import { FeatureMarker } from "./FeatureMarker"
import type { osmAuth } from "osm-auth"

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
    features?: GeoJSONFeature[]
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
    gbifId: string // GBIF taxon id ('' if unknown), used to find the Wikidata item
    selected: boolean
}

export type CandidateChoiceParams = {
    candidates: PlantNetCandidate[]
    setCandidates: (candidates: PlantNetCandidate[]) => void
    localizedSpeciesKey: string
    handleSelectCandidate: (props: Record<string, string>) => void
}

export type AttributesTabParams = {
    onLocateFeature: () => void
}

export type UploadTabParams = {
    osmLogin: () => void
    osmLogout: () => void
    onShowFeature: (feature: EditableFeature) => void
}

export type MapTabParams = {
    mapTabRef: React.RefObject<(() => void) | undefined>
    focusFeatureRef: React.RefObject<((feature: EditableFeature) => void) | undefined>
}

export type NaturalType = {
    icon: string
    color: string
    label: string
}

export type Combination = {
    label: string
    key: string
    natural: string[]
    values: Record<string, CombinationValue>
}

export type CombinationValue = {
    icon: string
    label: string
}

export type OverpassFeature = {
    type: "Feature";
    id: number // difference with maplibregl GeoJSON.Feature string | number | undefined
    geometry: Point // always type Point
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

// tags of the last edited feature (button "Dupliquer les attributs de l'élément précédent")
export type PreviousFeature = { id: number, tags: Record<string, string> } | null

export type SelectedFeatureContextValue = {
    value: SelectedFeature
    setValue: (value: SelectedFeature) => void // also updates the upload queue
    previous: PreviousFeature
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

// OSM element as handled by osm-request (opaque here)
export type OsmElement = object

// the part of osm-request used by the app (the package ships no types)
export type OsmRequestClient = {
    _auth: osmAuth | null // injected once connected
    createChangeset: (createdBy: string, comment: string) => Promise<string>
    closeChangeset: (changesetId: string) => Promise<unknown>
    fetchElement: (osmId: string) => Promise<OsmElement>
    fetchWaysForNode: (osmId: string) => Promise<OsmElement[]>
    fetchRelationsForElement: (osmId: string) => Promise<OsmElement[]>
    createNodeElement: (lat: number, lon: number, tags: Record<string, string>) => OsmElement
    setCoordinates: (element: OsmElement, lat: number, lon: number) => OsmElement
    removeTag: (element: OsmElement, key: string) => OsmElement
    setTags: (element: OsmElement, tags: Record<string, string>) => OsmElement
    sendElement: (element: OsmElement, changesetId: string) => Promise<number | string> // new id of a created element
    deleteElement: (element: OsmElement, changesetId: string) => Promise<unknown>
}

export type OSMConnection = {
    userName: string
    auth: osmAuth
    osmRequest: OsmRequestClient
    editedFeatures: Record<number, EditableFeature>
}

export type OSMConnectionContextValue = {
    value: OSMConnection,
    setValue: (value: OSMConnection) => void
}

export type Uploaded = {
    features: OverpassFeature[]
    idsToDelete: number[]
}

export type UploadedContextValue = {
    value: Uploaded
    setValue: (value: Uploaded) => void
}
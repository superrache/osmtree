import { createContext } from "react"
import { FeatureMarkersValue, MapContextValue, OSMConnection, OSMConnectionContextValue, SelectedFeature, SelectedFeatureContextValue, Uploaded, UploadedContextValue } from "./types"
import { FeatureMarker } from "./FeatureMarker"

export const SelectedFeatureContext = createContext<SelectedFeatureContextValue>({
    value: null,
    setValue: (_: SelectedFeature) => {},
    getNewId: () => 0
})

export const FeatureMarkersContext = createContext<FeatureMarkersValue>({
    value: {},
    setValue: (_: Record<number, FeatureMarker>) => {}
})

export const UploadedContext = createContext<UploadedContextValue>({
    value: {features: [], idsToDelete: []},
    setValue: (_: Uploaded) => {}
})

export const MapContext = createContext<MapContextValue>({
    bounds: '',
    setBounds: (_: string) => {}
})

export const OSMConnectionContext = createContext<OSMConnectionContextValue>({
    value: {
        userName: '',
        auth: null,
        osmRequest: null,
        editedFeatures: {}
    },
    setValue: (_: OSMConnection) => {}
})

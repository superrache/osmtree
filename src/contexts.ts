import { createContext } from "react"
import { FeatureMarkersValue, MapContextValue, OSMConnection, OSMConnectionContextValue, SelectedFeature, SelectedFeatureContextValue } from "./types"
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

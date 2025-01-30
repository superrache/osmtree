import { createContext } from "react"
import { MapContextValue, OSMConnection, OSMConnectionContextValue, SelectedFeature, SelectedFeatureContextValue } from "./types"

export const SelectedFeatureContext = createContext<SelectedFeatureContextValue>({
    value: null,
    setValue: (_: SelectedFeature) => {},
    getNewId: () => 0
})

export const MapContext = createContext<MapContextValue>({
    bounds: '',
    setBounds: (_: string) => {}
})

export const OSMConnectionContext = createContext<OSMConnectionContextValue>({
    value: {
        connected: false,
        userName: ''
    },
    setValue: (_: OSMConnection) => {}
})

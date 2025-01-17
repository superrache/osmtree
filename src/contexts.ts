import { createContext } from "react"
import { OSMConnection, OSMConnectionContextValue, SelectedFeature, SelectedFeatureContextValue } from "./types"

export const SelectedFeatureContext = createContext<SelectedFeatureContextValue>({
    value: null,
    setValue: (_: SelectedFeature) => {}
})

export const OSMConnectionContext = createContext<OSMConnectionContextValue>({
    value: {
        connected: false,
        userName: ''
    },
    setValue: (_: OSMConnection) => {}
})

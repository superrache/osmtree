import { createContext } from "react"
import { SelectedFeature, SelectedFeatureContextValue } from "./types"

const SelectedFeatureContext = createContext<SelectedFeatureContextValue>({
    value: null,
    setValue: (_: SelectedFeature) => {}
})

export default SelectedFeatureContext

import { Marker, MarkerOptions } from "maplibre-gl"
import { OverpassFeature } from "./types"

export class FeatureMarker extends Marker {
    feature: OverpassFeature

    constructor(feature: OverpassFeature, options?: MarkerOptions) {
        super(options)
        this.feature = feature
    }
}
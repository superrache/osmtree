import { Marker, MarkerOptions } from "maplibre-gl"

export class FeatureMarker extends Marker {
    feature: GeoJSON.Feature

    constructor(feature: GeoJSON.Feature, options?: MarkerOptions) {
        super(options)
        this.feature = feature
    }
}
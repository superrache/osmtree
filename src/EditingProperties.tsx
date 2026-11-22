import { LngLat } from "maplibre-gl"
import { OverpassFeature } from "./types"

export type EditingProperty = {
    key: string
    tag: string
    status: 'new' | 'deleted' | 'modified' | 'unmodified'
}

export type StoredEditingProperties = {
    props: EditingProperty[]
    newPosition: [number, number] | null // [lng, lat]
    deleted: boolean
}

export class EditingProperties {
    props: EditingProperty[]
    newPosition: LngLat | undefined
    deleted: boolean // the whole feature is to be deleted from OSM

    constructor(feature: OverpassFeature) {
        this.props = []
        for (const [key, value] of Object.entries(feature.properties)) {
            this.props.push({
                key: key,
                tag: value,
                status: 'unmodified'
            })
        }
        this.props.push({key: '', tag: '', status: 'new'})
        this.newPosition = undefined
        this.deleted = false
    }

    // independent copy, so that editing a queued feature doesn't change editedFeatures until validation
    clone(feature: OverpassFeature): EditingProperties {
        const copy = new EditingProperties(feature)
        copy.props = this.props.map((prop) => ({...prop}))
        copy.newPosition = this.newPosition
        copy.deleted = this.deleted
        return copy
    }

    // plain object for localStorage (newPosition: LngLat class → [lng, lat])
    toJSON(): StoredEditingProperties {
        return {
            props: this.props,
            newPosition: this.newPosition ? [this.newPosition.lng, this.newPosition.lat] : null,
            deleted: this.deleted
        }
    }

    static fromJSON(feature: OverpassFeature, data: StoredEditingProperties): EditingProperties {
        const editingProperties = new EditingProperties(feature)
        editingProperties.props = data.props.map((prop) => ({...prop}))
        editingProperties.newPosition = data.newPosition ? new LngLat(data.newPosition[0], data.newPosition[1]) : undefined
        editingProperties.deleted = data.deleted
        editingProperties.__createEmptyLineAtEnd()
        return editingProperties
    }

    isDeleted(): boolean {
        return this.deleted
    }

    setDeleted(deleted: boolean) {
        this.deleted = deleted
    }

    deleteKey(key: string): void {
        for (const [index, prop] of this.props.entries()) {
            if (prop.key === key) {
                if (prop.status === 'new') {
                    this.props.splice(index, 1)
                } else {
                    // mark as deleted but keep in props list
                    prop.status = 'deleted'
                }
                break    
            }
        }
        this.__createEmptyLineAtEnd()
    }

    modifyValue(key: string, tag: string): void {
        for (const prop of this.props) {
            if (prop.key === key) {
                if (tag === prop.tag && prop.status !== 'deleted') return // no change (keeps e.g. 'modified')
                const status = prop.status === 'new' ? 'new' : (tag !== prop.tag ? 'modified' : 'unmodified')
                prop.tag = tag
                prop.status = status
                return
            }
        }
        // the key doesn't exist yet
        // overwrite the last empty line with this key/value new pair
        this.props[this.props.length - 1] = {
            key: key,
            tag: tag,
            status: 'new'
        }
        this.__createEmptyLineAtEnd()
    }

    modifyKey(oldKey: string, newKey: string): void {
        for (const prop of this.props) {
            if (prop.key === oldKey) {
                prop.key = newKey
                prop.status = (prop.status === 'new' ? 'new' : 'modified')
                this.__createEmptyLineAtEnd()
                return
            }
        }
        // the key doesn't exist yet
        // overwrite the last empty line with this key/value new pair
        this.props[this.props.length - 1] = {
            key: newKey,
            tag: '',
            status: 'new'
        }
        this.__createEmptyLineAtEnd()
    }

    getProps(): EditingProperty[] {
        return this.props
    }

    getValue(key: string): string | undefined {
        for (const prop of this.props) {
            if (prop.key === key) return prop.tag
        }
        return undefined
    }

    getTagsToSend(): Record<string, string> {
        const tags: Record<string, string> = {}
        for (const prop of this.props) {
            if (prop.key !== '' && prop.tag !== '' && prop.status !== 'deleted') tags[prop.key] = prop.tag
        }
        return tags
    }

    getChangedCount(): number {
        let c = 0
        for (const prop of this.props) {
            if (prop.status !== 'unmodified') c++
        }
        if (this.newPosition) c++
        return c - 1
    }

    getNewPosition(): LngLat | undefined {
        return this.newPosition
    }

    setNewPosition(newPos: LngLat | undefined) {
        this.newPosition = newPos
    }

    __createEmptyLineAtEnd() {
        if (this.props[this.props.length - 1].key !== '') {
            // create an empty line at the end
            this.props.push({
                key: '',
                tag: '',
                status: 'new'
            })
        }
    }
}

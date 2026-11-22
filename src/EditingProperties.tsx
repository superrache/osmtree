import { LngLat } from "maplibre-gl"
import { OverpassFeature } from "./types"

export type EditingProperty = {
    key: string
    tag: string
    status: 'new' | 'deleted' | 'modified' | 'unmodified'
    originalKey?: string // key of this line in OSM (undefined: line added in the editor)
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
    // tags in OSM, the reference of every status (empty for a new feature, not in OSM yet)
    readonly originalTags: Record<string, string>

    constructor(feature: OverpassFeature) {
        this.props = []
        // a new feature (negative id) isn't in OSM yet: all its tags are new
        const isNew = feature.id < 0
        this.originalTags = isNew ? {} : { ...feature.properties }
        for (const [key, value] of Object.entries(feature.properties)) {
            this.props.push({
                key: key,
                tag: value,
                status: isNew ? 'new' : 'unmodified',
                originalKey: isNew ? undefined : key
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
        editingProperties.props = data.props.map((prop) => {
            // saved before originalKey existed: an OSM key kept its name
            if (!('originalKey' in prop) && prop.status !== 'new' && prop.key in editingProperties.originalTags) {
                return {...prop, originalKey: prop.key}
            }
            return {...prop}
        })
        editingProperties.newPosition = data.newPosition ? new LngLat(data.newPosition[0], data.newPosition[1]) : undefined
        editingProperties.deleted = data.deleted
        editingProperties.__update()
        return editingProperties
    }

    isDeleted(): boolean {
        return this.deleted
    }

    setDeleted(deleted: boolean) {
        this.deleted = deleted
    }

    // active line of a key: the last one, the value sent when a key is on several lines
    __findActiveIndex(key: string): number {
        for (let index = this.props.length - 1; index >= 0; index--) {
            if (this.props[index].key === key && this.props[index].status !== 'deleted') return index
        }
        return -1
    }

    // line of a key: the active one, else a deleted one (to restore it)
    __findIndex(key: string): number {
        const index = this.__findActiveIndex(key)
        return index !== -1 ? index : this.props.findIndex((prop) => prop.key === key)
    }

    // delete the line of a key (tag editor, IdentifierTab)
    deleteKey(key: string): void {
        if (key === '') return
        const index = this.__findActiveIndex(key)
        if (index !== -1) this.deleteAt(index)
    }

    deleteAt(index: number): void {
        const prop = this.props[index]
        if (prop === undefined || prop.status === 'deleted') return
        if (prop.originalKey === undefined) {
            if (index === this.props.length - 1) return // the empty last line stays
            this.props.splice(index, 1)
        } else {
            // in OSM: keep the line, with its original key and value, to show the deletion
            prop.key = prop.originalKey
            prop.tag = this.originalTags[prop.originalKey]
            prop.status = 'deleted'
        }
        this.__update()
    }

    // set the value of a key: its line, else the empty last line (IdentifierTab, duplication)
    modifyValue(key: string, tag: string): void {
        const index = this.__findIndex(key)
        if (index !== -1) {
            this.setTagAt(index, tag)
        } else {
            const last = this.props.length - 1
            this.props[last].key = key
            this.setTagAt(last, tag)
        }
    }

    // add a key on the empty last line (its value to be typed), or restore it if deleted
    addKey(key: string): void {
        const index = this.__findIndex(key)
        if (index === -1) {
            this.setKeyAt(this.props.length - 1, key)
        } else if (this.props[index].status === 'deleted') {
            this.setTagAt(index, this.props[index].tag)
        }
    }

    // edit one line of the tag editor (a key may be typed on several lines:
    // each line keeps its own value, the last one is sent)
    setTagAt(index: number, tag: string): void {
        const prop = this.props[index]
        if (prop === undefined) return
        prop.tag = tag
        if (prop.status === 'deleted') prop.status = 'unmodified' // restored, updated below
        this.__update()
    }

    setKeyAt(index: number, key: string): void {
        const prop = this.props[index]
        if (prop === undefined) return
        prop.key = key
        if (prop.status === 'deleted') prop.status = 'unmodified' // restored, updated below
        this.__update()
    }

    getProps(): EditingProperty[] {
        return this.props
    }

    getValue(key: string): string | undefined {
        const index = this.__findActiveIndex(key)
        return index !== -1 ? this.props[index].tag : undefined
    }

    getTagsToSend(): Record<string, string> {
        const tags: Record<string, string> = {}
        for (const prop of this.props) {
            if (prop.key !== '' && prop.tag !== '' && prop.status !== 'deleted') tags[prop.key] = prop.tag
        }
        return tags
    }

    // OSM keys that are not sent anymore (deleted or renamed)
    getTagsToRemove(): string[] {
        const tags = this.getTagsToSend()
        return Object.keys(this.originalTags).filter((key) => !(key in tags))
    }

    // tags that differ from OSM (added, modified, removed), and the position
    getChangedCount(): number {
        const tags = this.getTagsToSend()
        const keys = new Set([...Object.keys(this.originalTags), ...Object.keys(tags)])
        let c = [...keys].filter((key) => this.originalTags[key] !== tags[key]).length
        if (this.newPosition) c++
        return c
    }

    getNewPosition(): LngLat | undefined {
        return this.newPosition
    }

    setNewPosition(newPos: LngLat | undefined) {
        this.newPosition = newPos
    }

    // statuses compared with the OSM values (not with the previous edit), and the empty last line
    __update() {
        for (const prop of this.props) {
            if (prop.status === 'deleted') continue
            const original = this.originalTags[prop.key]
            if (original !== undefined) prop.status = prop.tag === original ? 'unmodified' : 'modified'
            else prop.status = prop.originalKey !== undefined ? 'modified' : 'new' // renamed, or added
        }
        this.__createEmptyLineAtEnd()
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

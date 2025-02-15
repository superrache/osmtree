import { LngLat } from "maplibre-gl"

export type EditingProperty = {
    key: string
    tag: string
    status: 'new' | 'deleted' | 'modified' | 'unmodified'
}

export class EditingProperties {
    props: EditingProperty[]
    newPosition: LngLat | undefined

    constructor(feature: GeoJSON.Feature) {
        this.props = []
        if (feature.properties) {
            for (const [key, value] of Object.entries(feature.properties)) {
                this.props.push({
                    key: key,
                    tag: value,
                    status: 'unmodified'
                })
            }
            this.props.push({key: '', tag: '', status: 'new'})
        }
        this.newPosition = undefined
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

    getTagsToSend(): Record<string, string | number> {
        const tags: Record<string, string | number> = {}
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

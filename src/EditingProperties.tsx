export type EditingProperty = {
    key: string
    tag: string
    status: 'new' | 'deleted' | 'modified' | 'unmodified'
}

export class EditingProperties {
    props: EditingProperty[]

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
    }

    modifyValue(key: string, tag: string): void {
        for (const prop of this.props) {
            if (prop.key === key) {
                prop.tag = tag
                prop.status = (prop.status === 'new' ? 'new' : 'modified')
                return
            }
        }
    }

    modifyKey(oldKey: string, newKey: string): void {
        for (const prop of this.props) {
            if (prop.key === oldKey) {
                prop.key = newKey
                prop.status = (prop.status === 'new' ? 'new' : 'modified')
                return
            }
        }
    }

    getProps(): EditingProperty[] {
        return this.props
    }

    createEmptyLineAtEnd() {
        if (this.props[this.props.length - 1].key !== '') this.props.push({
                key: '',
                tag: '',
                status: 'new'
        })
    }
}

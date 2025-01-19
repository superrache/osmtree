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
                if (prop.status in ['unmodified', 'modified']) {
                    prop.status = 'deleted'
                } else { // key was new
                    this.props.splice(index, 1)
                }
                break    
            }
        }
    }

    modifyValue(key: string, tag: string): void {
        for (const prop of this.props) {
            if (prop.key === key) {
                prop.tag = tag
                prop.status = 'modified'
                return
            }
        }
    }

    modifyKey(oldKey: string, newKey: string): void {
        for (const prop of this.props) {
            if (prop.key === oldKey) {
                prop.key = newKey
                prop.status = 'modified'
                return
            }
        }
    }

    getProps(): EditingProperty[] {
        return this.props
    }
}

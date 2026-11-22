import { EditingProperties, StoredEditingProperties } from './EditingProperties'
import { EditableFeature, OverpassFeature } from './types'

// the upload queue survives a reload, a killed tab or a phone gone to sleep
const storageKey = 'osmtree.editedFeatures.v1'

type StoredFeature = {
    feature: OverpassFeature
    editingProperties: StoredEditingProperties
}

export const loadEditedFeatures = (): Record<number, EditableFeature> => {
    const editedFeatures: Record<number, EditableFeature> = {}
    try {
        const json = localStorage.getItem(storageKey)
        if (json === null) return editedFeatures
        const stored = JSON.parse(json) as StoredFeature[]
        for (const { feature, editingProperties } of stored) {
            if (typeof feature?.id !== 'number' || !Array.isArray(editingProperties?.props)) continue
            editedFeatures[feature.id] = {
                feature: feature,
                editingProperties: EditingProperties.fromJSON(feature, editingProperties)
            }
        }
        console.log(`${Object.keys(editedFeatures).length} élément(s) restauré(s) depuis la sauvegarde locale`)
    } catch (error) {
        console.error('Sauvegarde locale illisible', error)
    }
    return editedFeatures
}

export const saveEditedFeatures = (editedFeatures: Record<number, EditableFeature>) => {
    try {
        const stored: StoredFeature[] = Object.values(editedFeatures).map(({ feature, editingProperties }) => ({
            feature: feature,
            editingProperties: editingProperties.toJSON()
        }))
        if (stored.length === 0) localStorage.removeItem(storageKey)
        else localStorage.setItem(storageKey, JSON.stringify(stored))
    } catch (error) {
        console.error('Sauvegarde locale impossible', error)
    }
}

import { useContext } from 'react'
import { SelectedFeatureContext } from './contexts'
import './WikiTab.css'

const WikiTab = () => {
    const selectedFeature = useContext(SelectedFeatureContext)

    // derived from the selection during render (no state copy updated by an effect)
    const species = selectedFeature.value === null ? '' :
        selectedFeature.value.editingProperties.getValue('species')
        ?? selectedFeature.value.editingProperties.getValue('species:fr')
        ?? selectedFeature.value.feature.properties['species']
        ?? selectedFeature.value.feature.properties['species:fr']
        ?? ''

    return (
        <div className='wiki_tab'>
            {species.length > 0 &&
                <iframe
                    id="inlineFrameExample"
                    title="Inline Frame Example"
                    width="100%"
                    height="100%"
                    src={`https://fr.wikipedia.org/wiki/${encodeURIComponent(species.replace(/ /g, '_'))}`}>
                </iframe>
            }
        </div>
    )
}

export default WikiTab

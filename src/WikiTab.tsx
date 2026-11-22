import { useContext } from 'react'
import { SelectedFeatureContext } from './contexts'
import './WikiTab.css'
import { lang, localizedSpeciesKey } from './i18n'

const WikiTab = () => {
    const selectedFeature = useContext(SelectedFeatureContext)

    // derived from the selection during render (no state copy updated by an effect)
    const species = selectedFeature.value === null ? '' :
        selectedFeature.value.editingProperties.getValue('species')
        ?? selectedFeature.value.editingProperties.getValue(localizedSpeciesKey)
        ?? selectedFeature.value.feature.properties['species']
        ?? selectedFeature.value.feature.properties[localizedSpeciesKey]
        ?? ''

    return (
        <div className='wiki_tab'>
            {species.length > 0 &&
                <iframe
                    title="Wikipedia"
                    width="100%"
                    height="100%"
                    src={`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(species.replace(/ /g, '_'))}`}>
                </iframe>
            }
        </div>
    )
}

export default WikiTab

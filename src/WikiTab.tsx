import { useContext, useState } from 'react'
import { SelectedFeatureContext } from './contexts'
import './WikiTab.css'
import { lang, localizedSpeciesKey, t } from './i18n'

type WikiSource = 'wikipedia' | 'wikidata'

const WikiTab = () => {
    const selectedFeature = useContext(SelectedFeatureContext)
    // page chosen with the selector, kept from one feature to the next
    const [source, setSource] = useState<WikiSource>('wikipedia')

    // derived from the selection during render (no state copy updated by an effect)
    const species = selectedFeature.value === null ? '' :
        selectedFeature.value.editingProperties.getValue('species')
        ?? selectedFeature.value.editingProperties.getValue(localizedSpeciesKey)
        ?? selectedFeature.value.feature.properties['species']
        ?? selectedFeature.value.feature.properties[localizedSpeciesKey]
        ?? ''
    const wikidata = selectedFeature.value?.editingProperties.getTagsToSend()['species:wikidata']
    const wikidataId = wikidata !== undefined && /^Q\d+$/.test(wikidata) ? wikidata : undefined

    const url = source === 'wikidata'
        ? (wikidataId !== undefined ? `https://www.wikidata.org/wiki/${wikidataId}?uselang=${lang}` : undefined)
        : (species.length > 0 ? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(species.replace(/ /g, '_'))}` : undefined)

    return (
        <div className='wiki_tab'>
            <div className='wiki_selector' role='tablist'>
                {(['wikipedia', 'wikidata'] as WikiSource[]).map((value) => (
                    <button key={value}
                        role='tab'
                        aria-selected={source === value}
                        className={source === value ? 'wiki_source_selected' : ''}
                        onClick={() => setSource(value)}>
                        {t(value === 'wikipedia' ? 'wiki.wikipedia' : 'wiki.wikidata')}
                    </button>
                ))}
            </div>
            {url !== undefined
                ? <iframe key={url} title={t(source === 'wikipedia' ? 'wiki.wikipedia' : 'wiki.wikidata')} src={url}></iframe>
                : selectedFeature.value !== null && <p className='wiki_message'>
                    {source === 'wikidata' ? t('wiki.noWikidata') : t('wiki.noSpecies')}
                </p>}
        </div>
    )
}

export default WikiTab

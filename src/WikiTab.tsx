import { useContext, useEffect, useState } from 'react'
import { SelectedFeatureContext } from './contexts'
import './WikiTab.css'

const WikiTab = () => {
    const selectedFeature = useContext(SelectedFeatureContext)
    const [species, setSpecies] = useState('')

    useEffect(() => {
        if (selectedFeature.value !== null) {
            const sp = selectedFeature.value.editingProperties.getValue('species') 
                        ?? selectedFeature.value.editingProperties.getValue('species:fr')
                        ?? selectedFeature.value.feature.properties['species'] 
                        ?? selectedFeature.value.feature.properties['species:fr']
            if (sp !== undefined) setSpecies(sp)
            else setSpecies('')
        } else {
            setSpecies('')
        }
    }, [selectedFeature.value])

    return (
        <div className='wiki_tab'>
            {species.length > 0 &&
                <iframe
                    id="inlineFrameExample"
                    title="Inline Frame Example"
                    width="100%"
                    height="100%"
                    src={`https://fr.wikipedia.org/wiki/${species}`}>
                </iframe>
            }
        </div>
    )
}

export default WikiTab

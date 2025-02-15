import { useContext, useEffect, useState } from 'react'
import { SelectedFeatureContext } from './contexts'
import './WikiTab.css'

const WikiTab = () => {
    const selectedFeature = useContext(SelectedFeatureContext)
    const [species, setSpecies] = useState('')

    useEffect(() => {
        if (selectedFeature.value !== null) {
            let sp = selectedFeature.value.editingProperties.getValue('species')
            if (sp === undefined) sp = selectedFeature.value.feature.properties ? selectedFeature.value.feature.properties['species'] : undefined
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

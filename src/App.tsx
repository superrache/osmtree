import { ChangeEvent,  useState } from 'react'
import logo from '/osmtree.svg' // also favicon
import cameraImg from './assets/camera.svg'
import leafImg from './assets/leaf.svg'
import flowerImg from './assets/flower.svg'
import fruitImg from './assets/fruit.svg'
import barkImg from './assets/bark.svg'
import './App.css'

type Organ = {
  id: string
  selected: boolean
  icon: string
}

class Result {
  imageUrl: string = ''
  score: number = 0
  genus: string = ''
  species: string = ''
  localizedSpecies: string = ''
}

function App() {
  const serverUrl = 'http://localhost:3000/api'
  const maxResults = 12

  const [organs, setOrgans] = useState<Organ[]>([
    {id: 'leaf', selected: true, icon: leafImg },
    {id: 'flower', selected: false, icon: flowerImg },
    {id: 'fruit', selected: false, icon: fruitImg },
    {id: 'bark', selected: false, icon: barkImg }
  ])

  const [pictureFile, setPictureFile] = useState<File>()
  const [picturePreview, setPicturePreview] = useState<string>('')
  const [readyToSend, setReadyToSend] = useState<boolean>(false)
  const [localizedSpeciesKey, setLocalizedSpeciesKey] = useState<string>('species:en')
  const [results, setResults] = useState<Result[]>([])

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      console.log('onFileInput', file.name)
      setPictureFile(file)
      setPicturePreview(URL.createObjectURL(file))
    }
  }

  const hasPreview = () => {
    return picturePreview.length > 0
  }

  const onOrganSelect = (e: Object, id: string) => {
    console.log('onOrganSelect', e)
    for(const organ of organs) {
      organ.selected = (organ.id === id)
      if(organ.id === id) console.log('select organ ' + organ.id)
    }
    console.log(organs)
  }

  const onIdentify = () => {
    console.log('onIdentify')
    // save current language to save result in the good osm key
    const lang = 'fr' // TODO: get user lang
    setLocalizedSpeciesKey(`species:${lang}`)

    const organ = organs.find(o => o.selected)

    if (organ !== undefined && pictureFile) {
      const form = new FormData()
      form.append('organs', organ.id) // only one, TODO: could be several
      form.append('image', pictureFile)
      form.append('lang', lang)

      const url = new URL(`${serverUrl}/plantnet-identify`)

      fetch(url.toString(), {
        method: 'post',
        body: form
      }).then((response) => {
        if (response.ok) {
          response.json().then((r) => {
            setResults([])
            for(const res of r.results) {
              if(results.length > maxResults) break
              let result = new Result()
              if('species' in res) {
                let species = res['species']
                if('commonNames' in species && species['commonNames'].length > 0) result.localizedSpecies = species['commonNames'][0]
                if('genus' in species && 'scientificNameWithoutAuthor' in species['genus']) result.genus = species['genus']['scientificNameWithoutAuthor']
                if('scientificNameWithoutAuthor' in species) result.species = species['scientificNameWithoutAuthor']
              }
                /* TODO: how to get these info from plantnet?
                this.editedProperties['leaf_cycle'] = ''
                this.editedProperties['leaf_type'] = ''*/

              result.imageUrl = res.images.length > 0 && res.images[0].url.m !== undefined ? res.images[0].url.m : ''
              result.score = res['score']
              results.push(result)
            }
          }).catch(console.error)
        }
      }).catch((error) => {
        console.error(error)
      })
    }
  }

  const onSave = () => {
    console.log('onSave')
  }

  return (
    <>
      <div>
        <h1>
          <img src={logo} className="logo" alt="osmtree" />
          osmtree</h1>
      </div>

      <div className="pictures">
        <div>
          <label id="camera_label" htmlFor='camera_input'>
            <img src={cameraImg} width='50' />
          </label>
          <input id="camera_input" type="file"
                name="picture" accept='image/*'
                capture="environment"
                onChange={onFileInput} />
        </div>
        {hasPreview() && <div>
          <img src={picturePreview} height='70'/>
        </div>}
      </div>

      <div className="organs">
        {organs.map((organ) => {
          return (
            <div className="organ" key={organ.id}
                style={{opacity: organ.selected ? 1 : 0.5}}
                onClick={(e) => onOrganSelect(e, organ.id)}>
              <img src={organ.icon} width='50' />
            </div>
          )
        })}
      </div>

      <div id="buttons">
        <button onClick={onIdentify} disabled={!hasPreview()}>Identifier</button>
        <button onClick={onSave} disabled={!readyToSend}>Enregistrer</button>
      </div>
    </>
  )
}

export default App  

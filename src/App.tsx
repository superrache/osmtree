import { ChangeEvent,  useState } from 'react'
import logo from '/osmtree.svg' // also favicon
import cameraImg from './assets/camera.svg'
import leafImg from './assets/leaf.svg'
import flowerImg from './assets/flower.svg'
import fruitImg from './assets/fruit.svg'
import barkImg from './assets/bark.svg'
import './App.css'

function App() {
  const [organs, setOrgans] = useState([
    {id: 'leaf', selected: true, icon: leafImg },
    {id: 'flower', selected: false, icon: flowerImg },
    {id: 'fruit', selected: false, icon: fruitImg },
    {id: 'bark', selected: false, icon: barkImg }
  ])

  const [pictureFile, setPictureFile] = useState<File>()
  const [picturePreview, setPicturePreview] = useState('')
  const [readyToSend, setReadyToSend] = useState(false)
  const [organ, setOrgan] = useState(organs[0])

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    console.log(e)
    if (e.target.files && e.target.files.length > 0) {
      setPictureFile(e.target.files[0])
      if (pictureFile) setPicturePreview(URL.createObjectURL(pictureFile))
    }
  }

  const hasPreview = () => {
    return picturePreview.length > 0
  }

  const onOrganSelect = (e: Object, id: string) => {
    console.log('onOrganSelect', e)
    for(const organ of organs) {
      organ.selected = (organ.id === id)
      if(organ.id === id) {
        console.log('select organ ' + organ.id)
        setOrgan(organ)
      }
    }
    console.log(organs)
  }

  const onIdentify = () => {
    console.log('onIdentify')
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

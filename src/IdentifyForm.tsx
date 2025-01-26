import { ChangeEvent,  useState } from 'react'
import cameraImg from './assets/camera.svg'
import leafImg from './assets/leaf.svg'
import flowerImg from './assets/flower.svg'
import fruitImg from './assets/fruit.svg'
import barkImg from './assets/bark.svg'
import './IdentifyForm.css'
import { IdentifyFormProps, IdentifyParams, Organ } from './types'
import { naturalTypes } from './consts'

const IdentifyForm = ({onIdentify, isLoading}: IdentifyFormProps) => {
  const [organs, _] = useState<Organ[]>([
    {id: 'leaf', selected: true, icon: leafImg, label: 'feuille'},
    {id: 'flower', selected: false, icon: flowerImg, label: 'fleur'},
    {id: 'fruit', selected: false, icon: fruitImg, label: 'fruit'},
    {id: 'bark', selected: false, icon: barkImg, label: 'écorce'}
  ]) // useState because selected will be modified

  const [organ, setOrgan] = useState<string>(organs[0].id)
  const [naturalType, setNaturalType] = useState<string>(naturalTypes.tree.tag)
  const [pictureFile, setPictureFile] = useState<File>()
  const [picturePreview, setPicturePreview] = useState<string>('')

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

  const onNaturalTypeSelect = (tag: string) => {
    for (const naturalType of Object.values(naturalTypes)) {
      naturalType.selected = (naturalType.tag === tag)
      if (naturalType.tag === tag) {
        setNaturalType(naturalType.tag)
      }
    }
  }

  const onOrganSelect = (id: string) => {
    for(const organ of organs) {
      organ.selected = (organ.id === id)
      if (organ.id === id) {
        console.log('select organ ' + organ.id)
        setOrgan(organ.id)
      }
    }
  }

  const handleIdentify = () => {
    if (pictureFile && organ) {
        const identifyParams: IdentifyParams = {
            pictureFile: pictureFile,
            organ: organ
        }
        onIdentify(identifyParams)
    }
  }

  return (
    <>
      <div className="organs">
        {Object.values(naturalTypes).map((naturalType) => {
          return (
            <div className="organ" key={naturalType.tag}
              style={{opacity: naturalType.selected ? 1 : 0.5}}
              onClick={() => onNaturalTypeSelect(naturalType.tag)}>
              <img src={naturalType.icon} width='50' />
              {naturalType.label}
            </div>
          )
        })}
      </div>
      <div className="pictures">
        <div className="camera">
          <button>
            <label className="button camera_label" htmlFor='camera_input'>
              <img src={cameraImg} width='50' />
            </label>
          </button>
          <input id="camera_input" type="file"
                name="picture" accept='image/*'
                capture="environment"
                onChange={onFileInput} />
        </div>
        {hasPreview() && <div className="picture-preview">
          <img src={picturePreview} height='70'/>
        </div>}
      </div>

      <div className="organs">
        {organs.map((organ) => {
          return (
            <div className="organ" key={organ.id}
                style={{opacity: organ.selected ? 1 : 0.5}}
                onClick={() => onOrganSelect(organ.id)}>
              <img src={organ.icon} width='50' />
              {organ.label}
            </div>
          )
        })}
      </div>

      <div id="buttons">
        <button onClick={handleIdentify} disabled={!hasPreview() || isLoading}>Identifier</button>
      </div>
    </>
  )
}

export default IdentifyForm  

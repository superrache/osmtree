import { ChangeEvent, useState } from 'react'
import cameraImg from './assets/camera.svg'
import poweredByPlantNetImg from './assets/powered-by-plantnet-dark.svg'
import './PlantNetIdentifyForm.css'
import { PlantNetIdentifyFormProps, PlantNetIdentifyParams } from './types'
import { organs } from './consts'

const PlantNetIdentifyForm = ({onIdentify, isLoading}: PlantNetIdentifyFormProps) => {
    const [organ, setOrgan] = useState<string>(Object.keys(organs)[0])
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

    const handleIdentify = () => {
        if (pictureFile) {
                const identifyParams: PlantNetIdentifyParams = {
                        pictureFile: pictureFile,
                        organ: organ
                }
                onIdentify(identifyParams)
        }
    }

    return (
        <>
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

            <div className="things">
                {Object.entries(organs).map(([oid, org]) => {
                    return (
                        <div className="thing" key={oid}
                                style={{opacity: oid === organ ? 1 : 0.5}}
                                onClick={() => setOrgan(oid)}>
                            <img src={org.icon} width='50' />
                            {org.label}
                        </div>
                    )
                })}
            </div>

            <div id="buttons">
                <button onClick={handleIdentify} disabled={!hasPreview() || isLoading}>Identifier avec Pl@ntNet</button>
            </div>
            <div className='plantnet_mention'>
                <a href="https://plantnet.org/" target="blank"><img src={poweredByPlantNetImg} width='200' /></a>
                <br/>
                <span>Le service utilisé pour l'identification par image des espèces végétales est basé sur l'API de reconnaissance Pl@ntNet, régulièrement mise à jour</span>
            </div>
        </>
    )
}

export default PlantNetIdentifyForm    

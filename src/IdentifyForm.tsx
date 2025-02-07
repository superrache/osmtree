import { ChangeEvent, useState } from 'react'
import cameraImg from './assets/camera.svg'
import './IdentifyForm.css'
import { IdentifyFormProps, IdentifyParams } from './types'
import { naturalTypes, organs } from './consts'

const IdentifyForm = ({onIdentify, isLoading}: IdentifyFormProps) => {
    const [organ, setOrgan] = useState<string>(Object.keys(organs)[0])
    const [naturalType, setNaturalType] = useState<string>(Object.keys(naturalTypes)[0])
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
                const identifyParams: IdentifyParams = {
                        pictureFile: pictureFile,
                        organ: organ,
                        naturalType: naturalType
                }
                onIdentify(identifyParams)
        }
    }

    return (
        <>
            <div className="organs">
                {Object.entries(naturalTypes).map(([tag, nt]) => {
                    return (
                        <div className="organ" key={tag}
                            style={{opacity: tag === naturalType ? 1 : 0.5}}
                            onClick={() => setNaturalType(tag)}>
                            <img src={nt.icon} width='50' />
                            {nt.label}
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
                {Object.entries(organs).map(([oid, org]) => {
                    return (
                        <div className="organ" key={oid}
                                style={{opacity: oid === organ ? 1 : 0.5}}
                                onClick={() => setOrgan(oid)}>
                            <img src={org.icon} width='50' />
                            {org.label}
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

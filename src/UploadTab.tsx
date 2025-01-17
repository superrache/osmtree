import { useContext } from 'react'
import './UploadTab.css'
import { OSMConnectionContext } from './contexts'

const UploadTab = () => {
    const osmConnection = useContext(OSMConnectionContext)

    const onConnect = () => {
        osmConnection.setValue({
            connected: true,
            userName: 'toto'
        })
    }

    const onDisconnect = () => {
        osmConnection.setValue({
            connected: false,
            userName: ''
        })
    }

    return (
        <div className="upload_tab">
            <br/>
            {!osmConnection.value.connected && <button onClick={() => onConnect()}>Se connecter à OpenStreetMap</button>}
            <br/>
            {osmConnection.value.connected && <div>
                Bienvenue {osmConnection.value.userName}
                <br/>
                <button onClick={() => onDisconnect()}>Se déconnecter</button>
                <button>Envoyer à OpenStreetMap</button>
            </div>}
        </div>
    )
}

export default UploadTab

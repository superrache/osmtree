import { useContext } from 'react'
import './UploadTab.css'
import { OSMConnectionContext } from './contexts'

const UploadTab = ({osmLogin, osmLogout}) => {
    const osmConnection = useContext(OSMConnectionContext)

    return (
        <div className="upload_tab">
            <br/>
            {osmConnection.value.auth.authenticated() ? <span>connecté</span> : <span>non connecté</span>}
            {!osmConnection.value.auth.authenticated() && <button onClick={osmLogin}>Se connecter à OpenStreetMap</button>}
            <br/>
            {osmConnection.value.auth.authenticated() && <div>
                Bienvenue {osmConnection.value.userName}
                <br/>
                <button onClick={osmLogout}>Se déconnecter</button>
                <button>Envoyer à OpenStreetMap</button>
            </div>}
        </div>
    )
}

export default UploadTab

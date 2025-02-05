import { useContext } from 'react'
import './UploadTab.css'
import { OSMConnectionContext } from './contexts'
import { UploadTabParams } from './types'

const UploadTab = ({osmLogin, osmLogout}: UploadTabParams) => {
    const osmConnection = useContext(OSMConnectionContext)

    return (
        <div className="upload_tab">
            <br/>
            {osmConnection.value.auth.authenticated() ? 
                <span>Connecté à <a href='https://www.openstreetmap.org' target="_blank">OpenStreetMap</a></span>
                : <span>La connexion à un compte <a href='https://www.openstreetmap.org' target="_blank">OpenStreetMap</a> est requise pour éditer les données.</span>}
            <br/>
            {!osmConnection.value.auth.authenticated() && <div>
                <button onClick={osmLogin}>Se connecter à OpenStreetMap</button>
            </div>}
            {osmConnection.value.auth.authenticated() && <div>
                Bienvenue <a href={'https://www.openstreetmap.org/user/' + osmConnection.value.userName} target="_blank">{osmConnection.value.userName}</a>
                <br/>
                <button onClick={osmLogout}>Se déconnecter</button>
                <br/>
                <br/>
                Entités prêtes à être envoyées :
                {osmConnection.value.editedFeatures.length === 0 && <div>Aucune</div>}
                {osmConnection.value.editedFeatures.length > 0 && <ul>
                    {osmConnection.value.editedFeatures.map((feature, index) => {
                        return <li key={index}><a>{feature.feature.properties!.natural} {feature.feature.id}</a></li>
                    })}
                </ul>}
                <br/>
                <button disabled={osmConnection.value.editedFeatures.length === 0}>Envoyer à OpenStreetMap</button>
            </div>}
        </div>
    )
}

export default UploadTab

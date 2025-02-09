import { useContext, useEffect, useRef, useState } from 'react'
import './UploadTab.css'
import { FeatureMarkersContext, OSMConnectionContext } from './contexts'
import { UploadTabParams } from './types'

const UploadTab = ({osmLogin, osmLogout}: UploadTabParams) => {
    const osmConnection = useContext(OSMConnectionContext)
    const featureMarkers = useContext(FeatureMarkersContext)
    const [comment, setComment] = useState<string>('')
    const [logs, setLogs] = useState<string[]>([])
    const logContainerRef = useRef(null)

    const commentChanged = (event) => {
        setComment(event.target.value)
    }

    const resetLogs = async () => { setLogs([]) }

    const appendLog = async (msg: string) => {
        setLogs(prevLogs => [...prevLogs, msg])
    }

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
        }
    }, [logs])

    const onSend = async () => {
        resetLogs()
        appendLog(`Envoi de ${osmConnection.value.editedFeatures.length} éléments vers OpenStreetMap`)

        const changesetId = await osmConnection.value.osmRequest.createChangeset('osmtree', comment)
        appendLog(`Groupe de modification créé : changeset=${changesetId}`)

        const newMarkers = featureMarkers.value

        for (const feature of osmConnection.value.editedFeatures) {
            if (feature.feature.id) {
                const id = feature.feature.id
                appendLog(`Elément ${id}`)
                const isNew = parseInt(`${id}`) < 0
                const coords = feature.feature.geometry.type === 'Point' ? feature.feature.geometry.coordinates : [0, 0]
                const tags = feature.editingProperties.getTagsToSend() // only new/modified/unmodified not empty tags

                if (isNew) {
                    let element = await osmConnection.value.osmRequest.createNodeElement(coords[1], coords[0], tags) // lat, lon
                    const newId = await osmConnection.value.osmRequest.sendElement(element, changesetId)
                    appendLog(`Nouvel identifiant ${newId}`)

                    // update the feature and marker
                    const marker = newMarkers[id]
                    marker.feature.id = newId
                    newMarkers[newId] = marker
                    delete newMarkers[id]
                } else {
                    let element = await osmConnection.value.osmRequest.fetchElement(`node/${id}`) // id au format node/123456789
                    // update coordinates
                    element = osmConnection.value.osmRequest.setCoordinates(element, coords[1], coords[0])
                    // tags to delete
                    for (const prop of feature.editingProperties.getProps()) {
                        if (prop.status === 'deleted') {
                            appendLog(`Suppression du tag ${prop.key}`)
                            element = osmConnection.value.osmRequest.removeTag(element, prop.key)
                        }
                    }
                    appendLog('Mise à jour des autres tags')
                    element = osmConnection.value.osmRequest.setTags(element, tags)
                    appendLog('Envoi de l\'élément')
                    await osmConnection.value.osmRequest.sendElement(element, changesetId)
                }
            }
        }
        appendLog('Fermeture du groupe de modification')
        await osmConnection.value.osmRequest.closeChangeset(changesetId)

        // reset data by setting empty editedFeatures...
        osmConnection.setValue({
            userName: osmConnection.value.userName,
            editedFeatures: [],
            auth: osmConnection.value.auth,
            osmRequest: osmConnection.value.osmRequest
        })
        // ...and updating features
        featureMarkers.setValue(newMarkers)
    }

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
                Eléments prêts à être envoyés :
                {osmConnection.value.editedFeatures.length === 0 && <div>Aucune</div>}
                {osmConnection.value.editedFeatures.length > 0 && <ul>
                    {osmConnection.value.editedFeatures.map((feature, index) => {
                        return <li key={index}><a>{feature.feature.properties!.natural} {feature.feature.id}</a></li>
                    })}
                </ul>}
                <br/>
                <input type="text"
                    className="comment"
                    onChange={commentChanged}
                    value={comment}
                    placeholder='commentaire du groupe de modification'/>
                <button
                    disabled={osmConnection.value.editedFeatures.length === 0 || comment.length === 0}
                    onClick={onSend}
                >
                    Envoyer à OpenStreetMap
                </button>
                <div
                    ref={logContainerRef}
                    className="logs"
                >
                    {logs.map((log, index) => (
                    <div key={index}>
                        {log}
                    </div>
                    ))}
                </div>
            </div>}
        </div>
    )
}

export default UploadTab

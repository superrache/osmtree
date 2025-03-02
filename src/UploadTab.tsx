import React, { useContext, useEffect, useRef, useState } from 'react'
import './UploadTab.css'
import { OSMConnectionContext, SelectedFeatureContext, UploadedContext } from './contexts'
import { OverpassFeature, UploadTabParams } from './types'
import { naturalTypes } from './consts'

const UploadTab = ({osmLogin, osmLogout}: UploadTabParams) => {
    const osmConnection = useContext(OSMConnectionContext)
    const selectedFeature = useContext(SelectedFeatureContext)
    const uploaded = useContext(UploadedContext)

    const [comment, setComment] = useState<string>('')
    const [logs, setLogs] = useState<string[]>([])
    const [lastChangesetId, setLastChangesetId] = useState<number>(0)
    const logContainerRef = useRef(null)

    const commentChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    useEffect(() => {
        // generate a comment from editedFeatures
        let news = 0, updates = 0
        const typeNames = new Set<string>()
        for (const feature of Object.values(osmConnection.value.editedFeatures)) {
            if (feature.feature.id < 0) news++
            else updates++
            if (feature.feature.properties.natural && feature.feature.properties.natural in naturalTypes) {
                typeNames.add(naturalTypes[feature.feature.properties.natural].label.toLowerCase())
            }
        }
        if (news > 0 || updates > 0) {
            let changeType = news > 0 ? 'ajout' : ''
            changeType += updates > 0 ? `${changeType.length > 0 ? ' /' : ''} mise à jour` : ''
            const featureCount = Object.keys(osmConnection.value.editedFeatures).length
            const plurial = featureCount > 1
            const names = Array.from(typeNames).join(plurial ? 's, ' : ', ') + (plurial ? 's' : '')
            setComment(`${changeType} de ${featureCount} ${names}`)
        }
    }, [osmConnection.value])

    const onSend = async () => {
        resetLogs()
        appendLog(`Envoi de ${Object.keys(osmConnection.value.editedFeatures).length} élément(s) vers OpenStreetMap`)
        const osmRequest = osmConnection.value.osmRequest

        const changesetId = await osmRequest.createChangeset('osmtree', comment)
        appendLog(`Groupe de modification créé : changeset=${changesetId}`)

        const uploadedFeatures: OverpassFeature[] = []
        const idsToDelete: number[] = []

        for (const feature of Object.values(osmConnection.value.editedFeatures)) {
            if (feature.feature.id) {
                const oldId = feature.feature.id
                appendLog(`Elément ${oldId}`)
                const isNew = oldId < 0
                let newId = oldId
                const newPosition = feature.editingProperties.getNewPosition() // LngLat or undefined
                const coordsLatLng = newPosition ? [newPosition.lat, newPosition.lng] : undefined
                const tags = feature.editingProperties.getTagsToSend() // only new/modified/unmodified not empty tags

                if (isNew) {
                    if (coordsLatLng === undefined) {
                        appendLog(`Annulation, coordonnées nulles`)
                    } else {
                        let element = await osmRequest.createNodeElement(coordsLatLng[0], coordsLatLng[1], tags)
                        newId = await osmRequest.sendElement(element, changesetId)
                        appendLog(`Nouvel identifiant ${newId}`)
                    }
                } else {
                    let element = await osmRequest.fetchElement(`node/${oldId}`) // id au format node/123456789
                    // update coordinates
                    if (coordsLatLng !== undefined) element = osmRequest.setCoordinates(element, coordsLatLng[0], coordsLatLng[1])
                    // tags to delete
                    for (const prop of feature.editingProperties.getProps()) {
                        if (prop.status === 'deleted') {
                            appendLog(`Suppression du tag ${prop.key}`)
                            element = osmRequest.removeTag(element, prop.key)
                        }
                    }
                    appendLog('Mise à jour des autres tags')
                    element = osmRequest.setTags(element, tags)
                    appendLog('Envoi de l\'élément')
                    await osmRequest.sendElement(element, changesetId)
                }

                // update the feature
                idsToDelete.push(oldId) // delete every uploaded feature before recreating
                uploadedFeatures.push({
                    type: 'Feature',
                    id: newId,
                    geometry: {type: 'Point', coordinates: coordsLatLng ? coordsLatLng : [0, 0]},
                    properties: tags
                })
            }
        }
        appendLog('Fermeture du groupe de modification')
        await osmRequest.closeChangeset(changesetId)
        setLastChangesetId(changesetId)

        // reset data by setting empty editedFeatures...
        osmConnection.setValue({
            userName: osmConnection.value.userName,
            editedFeatures: {},
            auth: osmConnection.value.auth,
            osmRequest: osmRequest
        })
        // ...and updating features
        // TODO: call MapTab.loadFeatures forcing update and deleting negative ids
        uploaded.setValue({
            features: uploadedFeatures,
            idsToDelete: idsToDelete
        })
    }

    const onEditedFeatureClick = (id: number) => {
        const feature = osmConnection.value.editedFeatures[id]
        selectedFeature.setValue(feature)
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
                {Object.keys(osmConnection.value.editedFeatures).length === 0 && <div>Aucun</div>}
                {Object.keys(osmConnection.value.editedFeatures).length > 0 && <ul>
                    {Object.values(osmConnection.value.editedFeatures).map((feature, index) => {
                        return <li key={index} onClick={() => onEditedFeatureClick(feature.feature.id)}><a>{feature.feature.properties.natural} {feature.feature.id}</a></li>
                    })}
                </ul>}
                <br/>
                <input type="text"
                    className="comment"
                    onChange={commentChanged}
                    value={comment}
                    placeholder='commentaire du groupe de modification'/>
                <button
                    disabled={Object.keys(osmConnection.value.editedFeatures).length === 0 || comment.length === 0}
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
                {lastChangesetId > 0 && <div>
                    Dernier groupe de modification envoyé : <a href={`https://www.openstreetmap.org/changeset/${lastChangesetId}`} target='blank'>{lastChangesetId}</a>
                </div>}
                <br/>
                <br/>
                <br/>
                <br/>
                <br/>
            </div>}
        </div>
    )
}

export default UploadTab

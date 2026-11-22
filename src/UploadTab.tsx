import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import "./UploadTab.css";
import { OSMConnectionContext, UploadedContext } from "./contexts";
import { OverpassFeature, UploadTabParams } from "./types";
import { buildChangesetComment, CommentedEdit } from "./changesetComment";
import { getNatural } from "./utils";

const UploadTab = ({ osmLogin, osmLogout, onShowFeature }: UploadTabParams) => {
  const osmConnection = useContext(OSMConnectionContext);
  const uploaded = useContext(UploadedContext);

  // comment typed by the user, null: use the automatic one
  const [customComment, setCustomComment] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastChangesetId, setLastChangesetId] = useState<number>(0);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const commentChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCustomComment(event.target.value);
  };

  const resetLogs = async () => {
    setLogs([]);
  };

  const appendLog = async (msg: string) => {
    setLogs((prevLogs) => [...prevLogs, msg]);
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // automatic comment, derived from editedFeatures during render (no state copy:
  // it would overwrite the user's comment each time the queue changes)
  const autoComment = useMemo(() => {
    const edits: CommentedEdit[] = Object.values(
      osmConnection.value.editedFeatures,
    ).map((feature) => ({
      action:
        feature.feature.id < 0
          ? "add"
          : feature.editingProperties.isDeleted()
            ? "delete"
            : "update",
      natural: getNatural(feature),
    }));
    return buildChangesetComment(edits);
  }, [osmConnection.value]);

  // a comment typed by the user wins; clearing the field brings the automatic one back
  const comment = customComment || autoComment;

  const onSend = async () => {
    resetLogs();
    appendLog(
      `Envoi de ${Object.keys(osmConnection.value.editedFeatures).length} élément(s) vers OpenStreetMap`,
    );
    const osmRequest = osmConnection.value.osmRequest;

    const changesetId = await osmRequest.createChangeset("osmtree", comment);
    appendLog(`Groupe de modification créé : changeset=${changesetId}`);

    const uploadedFeatures: OverpassFeature[] = [];
    const idsToDelete: number[] = [];

    for (const feature of Object.values(osmConnection.value.editedFeatures)) {
      if (feature.feature.id) {
        const oldId = feature.feature.id;
        appendLog(`Elément ${oldId}`);
        const isNew = oldId < 0;
        let newId = oldId;
        const newPosition = feature.editingProperties.getNewPosition(); // LngLat or undefined
        const coordsLatLng = newPosition
          ? [newPosition.lat, newPosition.lng]
          : undefined;
        const tags = feature.editingProperties.getTagsToSend(); // only new/modified/unmodified not empty tags

        if (feature.editingProperties.isDeleted()) {
          if (isNew) continue; // never sent to OSM, nothing to delete
          const osmId = `node/${oldId}`;
          // the API refuses to delete a node used by a way or a relation
          const ways = await osmRequest.fetchWaysForNode(osmId);
          const relations = await osmRequest.fetchRelationsForElement(osmId);
          if (ways.length > 0 || relations.length > 0) {
            appendLog(
              `Suppression impossible : l'élément est utilisé par ${ways.length} chemin(s) et ${relations.length} relation(s), ignoré`,
            );
            // redraw it as a regular feature
            idsToDelete.push(oldId);
            uploadedFeatures.push({
              ...feature.feature,
              properties: { ...feature.feature.properties },
            });
            continue;
          }
          const element = await osmRequest.fetchElement(osmId);
          appendLog("Suppression de l'élément");
          await osmRequest.deleteElement(element, changesetId);
          idsToDelete.push(oldId); // removed from the map, not recreated
          continue;
        }

        if (isNew) {
          if (coordsLatLng === undefined) {
            appendLog(`Annulation, coordonnées nulles`);
            continue;
          } else {
            const element = await osmRequest.createNodeElement(
              coordsLatLng[0],
              coordsLatLng[1],
              tags,
            );
            newId = Number(await osmRequest.sendElement(element, changesetId));
            appendLog(`Nouvel identifiant ${newId}`);
          }
        } else {
          let element = await osmRequest.fetchElement(`node/${oldId}`); // id au format node/123456789
          // update coordinates
          if (coordsLatLng !== undefined)
            element = osmRequest.setCoordinates(
              element,
              coordsLatLng[0],
              coordsLatLng[1],
            );
          // tags to delete
          for (const prop of feature.editingProperties.getProps()) {
            if (prop.status === "deleted") {
              appendLog(`Suppression du tag ${prop.key}`);
              element = osmRequest.removeTag(element, prop.key);
            }
          }
          appendLog("Mise à jour des autres tags");
          element = osmRequest.setTags(element, tags);
          appendLog("Envoi de l'élément");
          await osmRequest.sendElement(element, changesetId);
        }

        // update the feature
        idsToDelete.push(oldId); // delete every uploaded feature before recreating
        uploadedFeatures.push({
          type: "Feature",
          id: newId,
          // GeoJSON order is [lng, lat]; an unmoved feature keeps its current position
          geometry: {
            type: "Point",
            coordinates: newPosition
              ? [newPosition.lng, newPosition.lat]
              : feature.feature.geometry.coordinates,
          },
          properties: tags,
        });
      }
    }
    appendLog("Fermeture du groupe de modification");
    await osmRequest.closeChangeset(changesetId);
    setLastChangesetId(Number(changesetId));
    setCustomComment(null); // next changeset: automatic comment again

    // reset data by setting empty editedFeatures...
    osmConnection.setValue({
      userName: osmConnection.value.userName,
      editedFeatures: {},
      auth: osmConnection.value.auth,
      osmRequest: osmRequest,
    });
    // ...and updating features
    // TODO: call MapTab.loadFeatures forcing update and deleting negative ids
    uploaded.setValue({
      features: uploadedFeatures,
      idsToDelete: idsToDelete,
    });
  };

  const onEditedFeatureClick = (id: number) => {
    onShowFeature(osmConnection.value.editedFeatures[id]);
  };

  return (
    <div className="upload_tab">
      <br />
      {osmConnection.value.auth.authenticated() ? (
        <span>
          Connecté à{" "}
          <a href="https://www.openstreetmap.org" target="_blank">
            OpenStreetMap
          </a>
        </span>
      ) : (
        <span>
          La connexion à un compte{" "}
          <a href="https://www.openstreetmap.org" target="_blank">
            OpenStreetMap
          </a>{" "}
          est requise pour éditer les données.
        </span>
      )}
      <br />
      {!osmConnection.value.auth.authenticated() && (
        <div>
          <button onClick={osmLogin}>Se connecter à OpenStreetMap</button>
        </div>
      )}
      {osmConnection.value.auth.authenticated() && (
        <div>
          Bienvenue{" "}
          <a
            href={
              "https://www.openstreetmap.org/user/" +
              osmConnection.value.userName
            }
            target="_blank"
          >
            {osmConnection.value.userName}
          </a>
          <br />
          <button onClick={osmLogout}>Se déconnecter</button>
          <br />
          <br />
          Eléments prêts à être envoyés :
          {Object.keys(osmConnection.value.editedFeatures).length === 0 && (
            <div>Aucun</div>
          )}
          {Object.keys(osmConnection.value.editedFeatures).length > 0 && (
            <ul>
              {Object.values(osmConnection.value.editedFeatures).map(
                (feature, index) => {
                  return (
                    <li
                      key={index}
                      onClick={() => onEditedFeatureClick(feature.feature.id)}
                    >
                      <a>
                        {getNatural(feature)}{" "}
                        {feature.feature.id < 0
                          ? `(nouveau ${-feature.feature.id})`
                          : feature.feature.id}
                        {feature.editingProperties.isDeleted() &&
                          " (suppression)"}
                      </a>
                    </li>
                  );
                },
              )}
            </ul>
          )}
          <br />
          <input
            type="text"
            className="comment"
            onChange={commentChanged}
            value={comment}
            placeholder="commentaire du groupe de modification"
          />
          <button
            disabled={
              Object.keys(osmConnection.value.editedFeatures).length === 0 ||
              comment.length === 0
            }
            onClick={onSend}
          >
            Envoyer à OpenStreetMap
          </button>
          <div ref={logContainerRef} className="logs">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
          {lastChangesetId > 0 && (
            <div>
              Dernier groupe de modification envoyé :{" "}
              <a
                href={`https://www.openstreetmap.org/changeset/${lastChangesetId}`}
                target="blank"
              >
                {lastChangesetId}
              </a>
            </div>
          )}
          <br />
          <br />
          <br />
          <br />
          <br />
        </div>
      )}
    </div>
  );
};

export default UploadTab;

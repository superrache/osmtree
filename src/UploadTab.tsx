import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import "./UploadTab.css";
import {
  OSMConnectionContext,
  SelectedFeatureContext,
  UploadedContext,
} from "./contexts";
import { OverpassFeature, UploadTabParams } from "./types";
import { buildChangesetComment, CommentedEdit } from "./changesetComment";
import { getNatural, getNaturalLabel } from "./utils";
import { Lang, lang, languages, setLanguage, t } from "./i18n";

const UploadTab = ({ osmLogin, osmLogout, onShowFeature }: UploadTabParams) => {
  const osmConnection = useContext(OSMConnectionContext);
  const uploaded = useContext(UploadedContext);
  const selectedFeature = useContext(SelectedFeatureContext);

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
      t("upload.log.start", {
        n: Object.keys(osmConnection.value.editedFeatures).length,
      }),
    );
    const osmRequest = osmConnection.value.osmRequest;

    const changesetId = await osmRequest.createChangeset("osmtree", comment);
    appendLog(t("upload.log.changeset", { id: changesetId }));

    const uploadedFeatures: OverpassFeature[] = [];
    const idsToDelete: number[] = [];

    for (const feature of Object.values(osmConnection.value.editedFeatures)) {
      if (feature.feature.id) {
        const oldId = feature.feature.id;
        appendLog(t("upload.log.element", { id: oldId }));
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
              t("upload.log.deleteImpossible", {
                ways: ways.length,
                relations: relations.length,
              }),
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
          appendLog(t("upload.log.deleteElement"));
          await osmRequest.deleteElement(element, changesetId);
          idsToDelete.push(oldId); // removed from the map, not recreated
          continue;
        }

        if (isNew) {
          if (coordsLatLng === undefined) {
            appendLog(t("upload.log.noCoordinates"));
            continue;
          } else {
            const element = await osmRequest.createNodeElement(
              coordsLatLng[0],
              coordsLatLng[1],
              tags,
            );
            newId = Number(await osmRequest.sendElement(element, changesetId));
            appendLog(t("upload.log.newId", { id: newId }));
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
              appendLog(t("upload.log.deleteTag", { key: prop.key }));
              element = osmRequest.removeTag(element, prop.key);
            }
          }
          appendLog(t("upload.log.updateTags"));
          element = osmRequest.setTags(element, tags);
          appendLog(t("upload.log.sendElement"));
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
    appendLog(t("upload.log.close"));
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

  // revert every queued change: new features disappear, the others are redrawn
  // as loaded from OSM (same path as after an upload, through UploadedContext)
  const onCancelAll = () => {
    const editedFeatures = Object.values(osmConnection.value.editedFeatures);
    if (
      !window.confirm(
        t("upload.confirmCancelAll", { n: editedFeatures.length }),
      )
    )
      return;
    // unselect first: a selected feature with changes would go back to the queue
    const selected = selectedFeature.value;
    if (
      selected !== null &&
      selected.feature.id in osmConnection.value.editedFeatures
    )
      selectedFeature.setValue(null);
    osmConnection.setValue({ ...osmConnection.value, editedFeatures: {} });
    uploaded.setValue({
      features: editedFeatures
        .filter(({ feature }) => feature.id > 0)
        .map(({ feature }) => feature), // original tags and position
      idsToDelete: editedFeatures.map(({ feature }) => feature.id),
    });
    setLogs([t("upload.cancelledAll", { n: editedFeatures.length })]);
  };

  const onEditedFeatureClick = (id: number) => {
    onShowFeature(osmConnection.value.editedFeatures[id]);
  };

  return (
    <div className="upload_tab">
      <br />
      <label className="language">
        {t("upload.language")}{" "}
        <select
          value={lang}
          onChange={(event) => setLanguage(event.target.value as Lang)}
        >
          {Object.entries(languages).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <br />
      {osmConnection.value.auth.authenticated() ? (
        <span>
          {t("upload.connected")}{" "}
          <a href="https://www.openstreetmap.org" target="_blank">
            OpenStreetMap
          </a>
        </span>
      ) : (
        <span>
          {t("upload.loginRequired", { osm: "OpenStreetMap" })}
        </span>
      )}
      <br />
      {!osmConnection.value.auth.authenticated() && (
        <div>
          <button onClick={osmLogin}>{t("upload.login")}</button>
        </div>
      )}
      {osmConnection.value.auth.authenticated() && (
        <div>
          {t("upload.welcome")}{" "}
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
          <button onClick={osmLogout}>{t("upload.logout")}</button>
          <br />
          <br />
          {t("upload.ready")}
          {Object.keys(osmConnection.value.editedFeatures).length === 0 && (
            <div>{t("upload.none")}</div>
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
                        {getNaturalLabel(getNatural(feature))}{" "}
                        {feature.feature.id < 0
                          ? `(${t("upload.newFeature", { n: -feature.feature.id })})`
                          : feature.feature.id}
                        {feature.editingProperties.isDeleted() &&
                          t("upload.deletion")}
                      </a>
                    </li>
                  );
                },
              )}
            </ul>
          )}
          {Object.keys(osmConnection.value.editedFeatures).length > 0 && (
            <div>
              <button className="cancel-all" onClick={onCancelAll}>
                {t("upload.cancelAll")}
              </button>
            </div>
          )}
          <br />
          <input
            type="text"
            className="comment"
            onChange={commentChanged}
            value={comment}
            placeholder={t("upload.commentPlaceholder")}
          />
          <button
            disabled={
              Object.keys(osmConnection.value.editedFeatures).length === 0 ||
              comment.length === 0
            }
            onClick={onSend}
          >
            {t("upload.send")}
          </button>
          <div ref={logContainerRef} className="logs">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
          {lastChangesetId > 0 && (
            <div>
              {t("upload.lastChangeset")}{" "}
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

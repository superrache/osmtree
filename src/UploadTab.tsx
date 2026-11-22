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

// readable message of an osm-request error (Error, or the API response text)
const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const UploadTab = ({ osmLogin, osmLogout, onShowFeature }: UploadTabParams) => {
  const osmConnection = useContext(OSMConnectionContext);
  const uploaded = useContext(UploadedContext);
  const selectedFeature = useContext(SelectedFeatureContext);

  // comment typed by the user (with the automatic comment of that moment), null: automatic one
  const [customComment, setCustomComment] = useState<{
    text: string;
    autoComment: string;
  } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastChangesetId, setLastChangesetId] = useState<number>(0);
  const [sending, setSending] = useState<boolean>(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

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

  // a comment written by the user wins until the upload; an emptied field stays empty
  // (send button disabled) until the queue changes, then the automatic comment comes back
  const comment =
    customComment !== null &&
    (customComment.text !== "" || customComment.autoComment === autoComment)
      ? customComment.text
      : autoComment;

  const commentChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    // typing the automatic comment again gives it back its automatic updates
    setCustomComment(
      text === autoComment ? null : { text: text, autoComment: autoComment },
    );
  };

  const onSend = async () => {
    if (sending) return;
    setSending(true);
    resetLogs();
    const editedFeatures = osmConnection.value.editedFeatures;
    appendLog(t("upload.log.start", { n: Object.keys(editedFeatures).length }));
    const osmRequest = osmConnection.value.osmRequest;

    let changesetId: string | undefined;
    const uploadedFeatures: OverpassFeature[] = [];
    const idsToDelete: number[] = [];
    // features handled (sent, or nothing to send): they leave the queue, the others stay
    const doneIds = new Set<number>();

    try {
      changesetId = await osmRequest.createChangeset("osmtree", comment);
      appendLog(t("upload.log.changeset", { id: changesetId }));

      for (const feature of Object.values(editedFeatures)) {
        if (!feature.feature.id) continue;
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
          if (isNew) {
            doneIds.add(oldId); // never sent to OSM, nothing to delete
            continue;
          }
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
            doneIds.add(oldId);
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
          doneIds.add(oldId);
          idsToDelete.push(oldId); // removed from the map, not recreated
          continue;
        }

        if (isNew) {
          if (coordsLatLng === undefined) {
            appendLog(t("upload.log.noCoordinates"));
            continue;
          }
          const element = await osmRequest.createNodeElement(
            coordsLatLng[0],
            coordsLatLng[1],
            tags,
          );
          newId = Number(await osmRequest.sendElement(element, changesetId));
          appendLog(t("upload.log.newId", { id: newId }));
        } else {
          let element = await osmRequest.fetchElement(`node/${oldId}`); // id au format node/123456789
          // update coordinates
          if (coordsLatLng !== undefined)
            element = osmRequest.setCoordinates(
              element,
              coordsLatLng[0],
              coordsLatLng[1],
            );
          // tags to delete (deleted or renamed keys)
          for (const key of feature.editingProperties.getTagsToRemove()) {
            appendLog(t("upload.log.deleteTag", { key: key }));
            element = osmRequest.removeTag(element, key);
          }
          appendLog(t("upload.log.updateTags"));
          element = osmRequest.setTags(element, tags);
          appendLog(t("upload.log.sendElement"));
          await osmRequest.sendElement(element, changesetId);
        }

        // update the feature
        doneIds.add(oldId);
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
    } catch (error) {
      console.error("upload failed", error);
      appendLog(t("upload.log.error", { message: errorMessage(error) }));
    } finally {
      // never leave the changeset open, even after an error
      if (changesetId !== undefined) {
        try {
          appendLog(t("upload.log.close"));
          await osmRequest.closeChangeset(changesetId);
        } catch (error) {
          console.error("closing the changeset failed", error);
          appendLog(
            t("upload.log.closeError", { message: errorMessage(error) }),
          );
        }
        setLastChangesetId(Number(changesetId));
      }

      // the handled features leave the queue, the others stay (to be sent again)...
      const remaining = Object.fromEntries(
        Object.entries(editedFeatures).filter(
          ([id]) => !doneIds.has(Number(id)),
        ),
      );
      const remainingCount = Object.keys(remaining).length;
      if (remainingCount > 0)
        appendLog(t("upload.log.remaining", { n: remainingCount }));
      else setCustomComment(null); // next changeset: automatic comment again
      osmConnection.setValue({
        userName: osmConnection.value.userName,
        editedFeatures: remaining,
        auth: osmConnection.value.auth,
        osmRequest: osmRequest,
      });
      // ...and the map shows the uploaded features
      // TODO: call MapTab.loadFeatures forcing update and deleting negative ids
      uploaded.setValue({
        features: uploadedFeatures,
        idsToDelete: idsToDelete,
      });
      setSending(false);
    }
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
    setCustomComment(null); // empty queue: automatic comment again
    setLogs([t("upload.cancelledAll", { n: editedFeatures.length })]);
  };

  const onEditedFeatureClick = (id: number) => {
    onShowFeature(osmConnection.value.editedFeatures[id]);
  };

  return (
    <div className="upload_tab">
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
      {/* OSM account: connection state, user, log in / log out */}
      <div className="upload-group">
        {osmConnection.value.auth.authenticated() ? (
          <>
            <div>
              {t("upload.connected")}{" "}
              <a href="https://www.openstreetmap.org" target="_blank">
                OpenStreetMap
              </a>
            </div>
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
            </div>
            <button onClick={osmLogout}>{t("upload.logout")}</button>
          </>
        ) : (
          <>
            <div>{t("upload.loginRequired", { osm: "OpenStreetMap" })}</div>
            <button onClick={osmLogin}>{t("upload.login")}</button>
          </>
        )}
      </div>
      {osmConnection.value.auth.authenticated() && (
        <div>
          {/* upload queue: features to upload, Tout annuler */}
          <div className="upload-group">
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
                <button
                  className="cancel-all"
                  onClick={onCancelAll}
                  disabled={sending}
                >
                  {t("upload.cancelAll")}
                </button>
              </div>
            )}
          </div>
          <input
            type="text"
            className="comment"
            onChange={commentChanged}
            value={comment}
            placeholder={t("upload.commentPlaceholder")}
          />
          <button
            disabled={
              sending ||
              Object.keys(osmConnection.value.editedFeatures).length === 0 ||
              comment.trim().length === 0
            }
            onClick={onSend}
          >
            {sending ? t("upload.sending") : t("upload.send")}
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

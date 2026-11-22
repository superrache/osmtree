import { useContext } from "react";
import "./AttributesTab.css";
import {
  FeatureMarkersContext,
  OSMConnectionContext,
  SelectedFeatureContext,
  UploadedContext,
} from "./contexts";
import AutocompleteInput from "./AutocompleteInput";
import { AttributesTabParams, EditableFeature } from "./types";
import { EditingProperties } from "./EditingProperties";
import { getMissingExpectedTags } from "./utils";
import { notDuplicatedKeys } from "./consts";
import { t } from "./i18n";

const AttributesTab = ({ onLocateFeature }: AttributesTabParams) => {
  const selectedFeature = useContext(SelectedFeatureContext);
  const osmConnection = useContext(OSMConnectionContext);
  const featureMarkers = useContext(FeatureMarkersContext);
  const uploaded = useContext(UploadedContext);

  // tags of the last edited feature, to duplicate them on the next one (e.g. a row of trees)
  const previousFeature = selectedFeature.previous;

  const tagInfoInstance = "https://taginfo.openstreetmap.org";

  const onDeleteTag = (index: number) => {
    if (selectedFeature.value) {
      // the empty last line stays (EditingProperties.deleteAt)
      selectedFeature.value.editingProperties.deleteAt(index);
      updateVueFromModel();
    }
  };

  const onInputKey = async (searchTerm: string, _: string | null) => {
    const url = `${tagInfoInstance}/api/4/keys/all?page=1&rp=10&sortname=count_all&sortorder=desc&query=${encodeURIComponent(searchTerm)}`;
    const response = await fetch(url);
    const json = await response.json();
    const suggestions = [];
    for (const d of json.data) {
      suggestions.push(d.key);
    }
    return suggestions;
  };

  const onInputValue = async (searchTerm: string, key: string | null) => {
    // console.log('OnInputValue', searchTerm, key)
    const url = `${tagInfoInstance}/api/4/key/values?page=1&rp=10&sortname=count_all&sortorder=desc&key=${encodeURIComponent(key ?? "")}&query=${encodeURIComponent(searchTerm)}`;
    const response = await fetch(url);
    const json = await response.json();
    const suggestions = [];
    for (const d of json.data) {
      suggestions.push(d.value);
    }
    return suggestions;
  };

  // edit one line of the table (by index: a key may be typed again on the last line,
  // e.g. an existing or deleted one, without touching the other lines)
  const onInputChange = (index: number, isValue: boolean, newVal: string) => {
    if (selectedFeature.value === null) return;
    if (newVal === "") return; // no change
    const editingProperties = selectedFeature.value.editingProperties;
    const prop = editingProperties.getProps()[index];
    if (prop === undefined) return;
    if (newVal === (isValue ? prop.tag : prop.key)) return; // no change
    if (isValue) editingProperties.setTagAt(index, newVal);
    else editingProperties.setKeyAt(index, newVal);
    updateVueFromModel();
  };

  // add a missing expected key as a table line, its value to be typed
  const onAddExpectedKey = (key: string) => {
    if (selectedFeature.value === null) return;
    // fills the empty last line, or restores the deleted tag
    selectedFeature.value.editingProperties.addKey(key);
    updateVueFromModel();
  };

  const updateVueFromModel = () => {
    if (selectedFeature.value) {
      selectedFeature.setValue({
        feature: selectedFeature.value.feature,
        editingProperties: selectedFeature.value!.editingProperties,
      });
    }
  };

  // changes that Cancel would revert (a new feature keeps its position: Supprimer removes it)
  const getCancelableCount = (): number => {
    if (selectedFeature.value === null) return 0;
    const { feature, editingProperties } = selectedFeature.value;
    if (feature.id < 0) {
      // its tags are all 'new': compare with its initial tags
      const initial = new EditingProperties(feature).getTagsToSend();
      const current = editingProperties.getTagsToSend();
      const keys = new Set([...Object.keys(initial), ...Object.keys(current)]);
      return [...keys].filter((key) => initial[key] !== current[key]).length;
    }
    return editingProperties.getChangedCount();
  };

  const onCancel = () => {
    if (selectedFeature.value !== null) {
      const { feature, editingProperties } = selectedFeature.value;
      const resetEditingProperties = new EditingProperties(feature);
      if (feature.id < 0)
        resetEditingProperties.setNewPosition(
          editingProperties.getNewPosition(),
        );
      // the queue follows (SelectedFeatureContext.setValue)
      selectedFeature.setValue({
        feature: selectedFeature.value.feature,
        editingProperties: resetEditingProperties,
      });
    }
  };

  // replace the upload queue entry of a feature (undefined: remove it from the queue)
  const setEditedFeature = (
    id: number,
    editableFeature: EditableFeature | undefined,
  ) => {
    // (most changes reach the queue through SelectedFeatureContext.setValue)
    const editedFeatures = { ...osmConnection.value.editedFeatures };
    if (editableFeature === undefined) delete editedFeatures[id];
    else editedFeatures[id] = editableFeature;
    osmConnection.setValue({
      userName: osmConnection.value.userName,
      auth: osmConnection.value.auth,
      osmRequest: osmConnection.value.osmRequest,
      editedFeatures: editedFeatures,
    });
  };

  const onDeleteFeature = () => {
    if (selectedFeature.value === null) return;
    const { feature, editingProperties } = selectedFeature.value;
    const isNew = feature.id < 0;
    const question = isNew
      ? t("attributes.confirmDeleteNew")
      : t("attributes.confirmDelete");
    if (!window.confirm(question)) return;

    const markerElement = featureMarkers.value[feature.id]?.getElement();
    markerElement?.classList.remove("feature-marker-selected");
    if (isNew) {
      // never sent to OSM: just forget it (MapTab removes the marker)
      setEditedFeature(feature.id, undefined);
      uploaded.setValue({ features: [], idsToDelete: [feature.id] });
    } else {
      // queue the deletion, sent with the next changeset
      editingProperties.setDeleted(true);
      setEditedFeature(feature.id, { feature, editingProperties });
      markerElement?.classList.add("feature-marker-deleted");
    }
    selectedFeature.setValue(null);
  };

  const onRestoreFeature = () => {
    if (selectedFeature.value === null) return;
    const { feature, editingProperties } = selectedFeature.value;
    editingProperties.setDeleted(false);
    // the feature stays in the queue only if it has other changes (SelectedFeatureContext.setValue)
    featureMarkers.value[feature.id]
      ?.getElement()
      .classList.remove("feature-marker-deleted");
    updateVueFromModel();
  };

  // tags of the previous feature that would change the selected one
  const getTagsToDuplicate = (): Record<string, string> => {
    if (previousFeature === null || selectedFeature.value === null) return {};
    if (previousFeature.id === selectedFeature.value.feature.id) return {};
    const editingProperties = selectedFeature.value.editingProperties;
    const tags: Record<string, string> = {};
    for (const [key, value] of Object.entries(previousFeature.tags)) {
      if (notDuplicatedKeys.includes(key)) continue;
      // missing, deleted or different
      if (editingProperties.getValue(key) !== value) tags[key] = value;
    }
    return tags;
  };

  const onDuplicatePrevious = () => {
    if (selectedFeature.value === null) return;
    // add the missing tags and overwrite the different values; other tags are kept
    for (const [key, value] of Object.entries(getTagsToDuplicate())) {
      selectedFeature.value.editingProperties.modifyValue(key, value);
    }
    updateVueFromModel();
  };

  // changes are already in the upload queue: just unselect the feature
  const onDone = () => {
    if (selectedFeature.value === null) return;
    featureMarkers.value[selectedFeature.value.feature.id]
      ?.getElement()
      .classList.remove("feature-marker-selected");
    selectedFeature.setValue(null);
  };

  return (
    <div className="attributes_tab">
      <h2>{t("attributes.title")}</h2>
      {!osmConnection.value.auth.authenticated() &&
        selectedFeature.value !== null && (
          <div>
            <table>
              <thead>
                <tr>
                  <th>{t("attributes.key")}</th>
                  <th>=</th>
                  <th>{t("attributes.value")}</th>
                </tr>
              </thead>
              {Object.entries(selectedFeature.value.feature.properties).map(
                ([key, value]) => (
                  <tbody key={key}>
                    <tr>
                      <td>{key}</td>
                      <td>=</td>
                      <td>{value}</td>
                    </tr>
                  </tbody>
                ),
              )}
            </table>
            <span>{t("attributes.loginToEdit")}</span>
          </div>
        )}
      {osmConnection.value.auth.authenticated() &&
        selectedFeature.value !== null &&
        selectedFeature.value.editingProperties.isDeleted() && (
          <div>
            <p>{t("attributes.willBeDeleted")}</p>
            <div className="buttons">
              <button onClick={onRestoreFeature}>
                {t("attributes.restore")}
              </button>
            </div>
          </div>
        )}
      {osmConnection.value.auth.authenticated() &&
        selectedFeature.value !== null &&
        !selectedFeature.value.editingProperties.isDeleted() && (
          <div>
            <table>
              <thead>
                <tr>
                  <th>{t("attributes.key")}</th>
                  <th>=</th>
                  <th>{t("attributes.value")}</th>
                </tr>
              </thead>
              {selectedFeature.value &&
                selectedFeature.value.editingProperties
                  .getProps()
                  .map((prop, index) => (
                    <tbody key={index}>
                      <tr className={`attribute_${prop.status}`}>
                        <td>
                          <AutocompleteInput
                            value={prop.key}
                            other={null}
                            suggestionsFunction={onInputKey}
                            onValueChange={(_value, _other, newVal) =>
                              onInputChange(index, false, newVal)
                            }
                          />
                        </td>
                        <td>=</td>
                        <td>
                          <AutocompleteInput
                            value={prop.tag}
                            other={prop.key}
                            suggestionsFunction={onInputValue}
                            onValueChange={(_value, _other, newVal) =>
                              onInputChange(index, true, newVal)
                            }
                          />
                        </td>
                        <td>
                          <button onClick={() => onDeleteTag(index)}>x</button>
                        </td>
                      </tr>
                    </tbody>
                  ))}
            </table>
            {getMissingExpectedTags(
              selectedFeature.value.editingProperties.getTagsToSend(),
            ).length > 0 && (
              <p className="missing-tags">
                {t("attributes.missingTags")}{" "}
                {getMissingExpectedTags(
                  selectedFeature.value.editingProperties.getTagsToSend(),
                ).map((expectedTag, index) => (
                  <span key={expectedTag.key}>
                    {index > 0 && ", "}
                    <a
                      className="missing-tag"
                      onClick={() => onAddExpectedKey(expectedTag.key)}
                    >
                      {expectedTag.label}
                    </a>
                  </span>
                ))}
              </p>
            )}
            {selectedFeature.value.feature.geometry.type === "Point" &&
              selectedFeature.value.feature.geometry.coordinates[0] === 0 && (
                <div>
                  {t("attributes.noPosition")}{" "}
                  <button onClick={onLocateFeature}>
                    {t("attributes.locate")}
                  </button>
                </div>
              )}
            {selectedFeature.value.feature.geometry.type === "Point" &&
              selectedFeature.value.feature.geometry.coordinates[0] !== 0 && (
                <div>
                  <button onClick={onLocateFeature}>
                    {t("attributes.move")}
                  </button>
                </div>
              )}
            <div>
              <button
                onClick={onDuplicatePrevious}
                disabled={Object.keys(getTagsToDuplicate()).length === 0}
              >
                {t("attributes.duplicatePrevious")}
              </button>
            </div>
            <div className="buttons">
              <button onClick={onDone}>{t("attributes.done")}</button>
              <button onClick={onCancel} disabled={getCancelableCount() === 0}>
                {t("attributes.cancel")}
              </button>
              <button className="delete-feature" onClick={onDeleteFeature}>
                {t("attributes.delete")}
              </button>
            </div>
          </div>
        )}
    </div>
  );
};

export default AttributesTab;

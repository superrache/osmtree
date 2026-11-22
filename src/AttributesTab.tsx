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

// FIXME: bug: create an existing key with the last line
// FIXME: bug: delete a key then recreate it with the last line

const AttributesTab = ({ onLocateFeature }: AttributesTabParams) => {
  const selectedFeature = useContext(SelectedFeatureContext);
  const osmConnection = useContext(OSMConnectionContext);
  const featureMarkers = useContext(FeatureMarkersContext);
  const uploaded = useContext(UploadedContext);

  // tags of the last edited feature, to duplicate them on the next one (e.g. a row of trees)
  const previousFeature = selectedFeature.previous;

  const tagInfoInstance = "https://taginfo.openstreetmap.org";

  const onDeleteTag = (key: string) => {
    if (selectedFeature.value && key !== "") {
      // don't delete new key/value ''/''
      selectedFeature.value.editingProperties.deleteKey(key);
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

  const onInputChange = (
    value: string,
    other: string | null,
    newVal: string,
  ) => {
    if (selectedFeature.value === null) return;
    if (newVal === "") return; // no change
    if (value === newVal) return; // no change

    const isValue = other !== null; // else is key

    // console.log(`onInputChange ${isValue ? 'value' : 'key'} ${value} ${isValue ? other : ''} => ${newVal}`)

    let updateModel = false;
    if (isValue) {
      // update a tag value
      if (value !== newVal) {
        // value changed
        // update the value
        selectedFeature.value.editingProperties.modifyValue(other, newVal);
        // need update
        updateModel = true;
      }
    } else {
      // value is a key
      if (value !== newVal) {
        // key changed
        selectedFeature.value.editingProperties.modifyKey(value, newVal);
        updateModel = true;
      }
    }
    if (updateModel) {
      updateVueFromModel();
    }
  };

  // add a missing expected key as a table line, its value to be typed
  const onAddExpectedKey = (key: string) => {
    if (selectedFeature.value === null) return;
    const editingProperties = selectedFeature.value.editingProperties;
    const existing = editingProperties
      .getProps()
      .find((prop) => prop.key === key);
    if (existing === undefined) {
      editingProperties.modifyKey("", key); // fills the last empty line
    } else if (existing.status === "deleted") {
      editingProperties.modifyValue(key, existing.tag); // restores the deleted tag
    } else {
      return; // already in the table, value still empty
    }
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
      ? "Supprimer ce nouvel élément ?"
      : "Supprimer cet élément d'OpenStreetMap ?\nLa suppression sera envoyée avec le prochain groupe de modification.";
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
      const current = editingProperties
        .getProps()
        .find((prop) => prop.key === key);
      if (
        current === undefined ||
        current.tag !== value ||
        current.status === "deleted"
      )
        tags[key] = value;
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
      <h2>Attributs</h2>
      {!osmConnection.value.auth.authenticated() &&
        selectedFeature.value !== null && (
          <div>
            <table>
              <thead>
                <tr>
                  <th>Clé</th>
                  <th>=</th>
                  <th>Valeur</th>
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
            <span>Connecte-toi à OpenStreetMap pour éditer les attributs</span>
          </div>
        )}
      {osmConnection.value.auth.authenticated() &&
        selectedFeature.value !== null &&
        selectedFeature.value.editingProperties.isDeleted() && (
          <div>
            <p>
              Cet élément sera supprimé d'OpenStreetMap lors du prochain envoi.
            </p>
            <div className="buttons">
              <button onClick={onRestoreFeature}>Annuler la suppression</button>
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
                  <th>Clé</th>
                  <th>=</th>
                  <th>Valeur</th>
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
                            onValueChange={onInputChange}
                          />
                        </td>
                        <td>=</td>
                        <td>
                          <AutocompleteInput
                            value={prop.tag}
                            other={prop.key}
                            suggestionsFunction={onInputValue}
                            onValueChange={onInputChange}
                          />
                        </td>
                        <td>
                          <button onClick={() => onDeleteTag(prop.key)}>
                            x
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  ))}
            </table>
            {getMissingExpectedTags(
              selectedFeature.value.editingProperties.getTagsToSend(),
            ).length > 0 && (
              <p className="missing-tags">
                Tags à compléter :{" "}
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
                  Cet élément n'a pas de position géographique : il sera
                  enregistré une fois positionné.{" "}
                  <button onClick={onLocateFeature}>Positionner</button>
                </div>
              )}
            {selectedFeature.value.feature.geometry.type === "Point" &&
              selectedFeature.value.feature.geometry.coordinates[0] !== 0 && (
                <div>
                  <button onClick={onLocateFeature}>Déplacer l'élément</button>
                </div>
              )}
            <div>
              <button
                onClick={onDuplicatePrevious}
                disabled={Object.keys(getTagsToDuplicate()).length === 0}
              >
                Dupliquer les attributs de l'élément précédent
              </button>
            </div>
            <div className="buttons">
              <button onClick={onDone}>Terminer</button>
              <button onClick={onCancel} disabled={getCancelableCount() === 0}>
                Annuler
              </button>
              <button className="delete-feature" onClick={onDeleteFeature}>
                Supprimer
              </button>
            </div>
          </div>
        )}
    </div>
  );
};

export default AttributesTab;

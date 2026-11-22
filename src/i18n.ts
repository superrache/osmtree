// Internationalisation: the language is chosen once per page load (browser language, or the
// user's choice saved in localStorage); changing it reloads the page (see setLanguage), so that
// module-level labels (consts.ts) and the MapLibre controls follow too.
// To add a language: add it to `languages` and give it a dictionary typed `Messages`.

export const languages = {
    fr: 'Français',
    en: 'English'
} as const

export type Lang = keyof typeof languages

const storageKey = 'osmtree.lang'
const defaultLang: Lang = 'en' // for a browser language without translation

const isLang = (value: unknown): value is Lang => typeof value === 'string' && value in languages

const detectLanguage = (): Lang => {
    try {
        const saved = localStorage.getItem(storageKey)
        if (isLang(saved)) return saved
    } catch {
        // storage unavailable (private mode…): browser language
    }
    for (const tag of navigator.languages ?? [navigator.language]) {
        const base = tag.toLowerCase().split('-')[0]
        if (isLang(base)) return base
    }
    return defaultLang
}

// current language (also the Pl@ntNet language and the xx of species:xx)
export const lang: Lang = detectLanguage()
document.documentElement.lang = lang

// save the choice and reload the page in this language (the upload queue is saved locally)
export const setLanguage = (newLang: Lang) => {
    if (newLang === lang) return
    try {
        localStorage.setItem(storageKey, newLang)
    } catch {
        return // can't be kept across the reload
    }
    window.location.reload()
}

const fr = {
    // tabs
    'tab.map': 'Carte',
    'tab.attributes': 'Attributs',
    'tab.identify': 'Assistant',
    'tab.wiki': 'Wiki',
    'tab.upload': 'Envoi OSM',

    // natural types, combinations, organs (consts.ts)
    'natural.tree': 'Arbre',
    'natural.shrub': 'Arbuste',
    'natural.plant': 'Herbacée',
    'combination.denotation': 'Dénotation',
    'combination.denotation.none': 'Aucun',
    'combination.denotation.landmark': 'Repère géographique',
    'combination.denotation.natural_monument': 'Monument naturel',
    'combination.denotation.urban': 'Urbain',
    'combination.denotation.park': 'Parc',
    'combination.denotation.garden': 'Jardin',
    'combination.denotation.agricultural': 'Agricole',
    'combination.leaf_type': 'Type de feuille',
    'combination.leaf_type.none': 'Non renseigné',
    'combination.leaf_type.broadleaved': 'Feuilles',
    'combination.leaf_type.needleleaved': 'Aiguilles',
    'combination.leaf_type.leafless': 'Sans feuille',
    'combination.leaf_cycle': 'Phénologie',
    'combination.leaf_cycle.none': 'Non renseigné',
    'combination.leaf_cycle.deciduous': 'Caduque',
    'combination.leaf_cycle.evergreen': 'Persistant',
    'combination.leaf_cycle.semi_evergreen': 'Semi-persistant',
    'organ.leaf': 'Feuille',
    'organ.flower': 'Fleur',
    'organ.fruit': 'Fruit',
    'organ.bark': 'Écorce',
    'expectedTag.species': 'species ou species:xx',

    // map
    'map.osmCredit': "&copy; les contributeurs d'OpenStreetMap",
    'map.newFeature': 'nouvel élément (id temporaire {id})',
    'map.autoBearing.on': 'Orientation automatique de la carte selon la boussole : activée',
    'map.autoBearing.off': 'Orientation automatique de la carte selon la boussole : désactivée',
    'map.switchStyle': 'Changer le fond de carte',
    'map.loading': 'Chargement…',
    'map.loadError': 'Données indisponibles',
    'map.retry': 'Réessayer',
    'map.add': 'Ajouter un élément',
    'map.duplicate': "Dupliquer l'élément sélectionné",
    'map.confirmPosition': 'Valider la position',
    'map.cancelPosition': 'Annuler',
    'species.unknown': 'inconnu',

    // MapLibre controls
    'maplibre.toggleAttribution': 'Afficher ou masquer les crédits',
    'maplibre.mapFeedback': 'Signaler une erreur sur la carte',
    'maplibre.fullscreenEnter': 'Plein écran',
    'maplibre.fullscreenExit': 'Quitter le plein écran',
    'maplibre.findMyLocation': 'Me localiser',
    'maplibre.locationNotAvailable': 'Position indisponible',
    'maplibre.logo': 'Logo MapLibre',
    'maplibre.map': 'Carte',
    'maplibre.marker': 'Marqueur',
    'maplibre.resetBearing': 'Réorienter la carte vers le nord',
    'maplibre.zoomIn': 'Zoomer',
    'maplibre.zoomOut': 'Dézoomer',
    'maplibre.close': 'Fermer',

    // attributes
    'attributes.title': 'Attributs',
    'attributes.key': 'Clé',
    'attributes.value': 'Valeur',
    'attributes.loginToEdit': 'Connecte-toi à OpenStreetMap pour éditer les attributs',
    'attributes.willBeDeleted': "Cet élément sera supprimé d'OpenStreetMap lors du prochain envoi.",
    'attributes.restore': 'Annuler la suppression',
    'attributes.missingTags': 'Tags à compléter :',
    'attributes.noPosition': "Cet élément n'a pas de position géographique : il sera enregistré une fois positionné.",
    'attributes.locate': 'Positionner',
    'attributes.move': "Déplacer l'élément",
    'attributes.duplicatePrevious': "Dupliquer les attributs de l'élément précédent",
    'attributes.done': 'Terminer',
    'attributes.cancel': 'Annuler',
    'attributes.delete': 'Supprimer',
    'attributes.confirmDeleteNew': 'Supprimer ce nouvel élément ?',
    'attributes.confirmDelete': "Supprimer cet élément d'OpenStreetMap ?\nLa suppression sera envoyée avec le prochain groupe de modification.",

    // identification assistant
    'identify.naturalType': 'Type principal',
    'identify.plantnet': 'Identification Pl@ntNet',
    'identify.inProgress': 'Identification en cours…',
    'identify.error': "L'identification a échoué, réessaie plus tard.",
    'identify.button': 'Identifier avec Pl@ntNet',
    'identify.plantnetMention': "Le service utilisé pour l'identification par image des espèces végétales est basé sur l'API de reconnaissance Pl@ntNet, régulièrement mise à jour",
    'identify.score': 'fiabilité : {score} %',

    // upload
    'upload.connected': 'Connecté à',
    'upload.loginRequired': 'La connexion à un compte {osm} est requise pour éditer les données.',
    'upload.login': 'Se connecter à OpenStreetMap',
    'upload.welcome': 'Bienvenue',
    'upload.logout': 'Se déconnecter',
    'upload.ready': 'Éléments prêts à être envoyés :',
    'upload.none': 'Aucun',
    'upload.newFeature': 'nouveau {n}',
    'upload.deletion': ' (suppression)',
    'upload.cancelAll': 'Tout annuler',
    'upload.confirmCancelAll': 'Annuler les modifications de {n} élément(s) ?',
    'upload.cancelledAll': 'Modifications de {n} élément(s) annulées',
    'upload.commentPlaceholder': 'commentaire du groupe de modification',
    'upload.send': 'Envoyer à OpenStreetMap',
    'upload.lastChangeset': 'Dernier groupe de modification envoyé :',
    'upload.language': 'Langue',
    'upload.log.start': 'Envoi de {n} élément(s) vers OpenStreetMap',
    'upload.log.changeset': 'Groupe de modification créé : changeset={id}',
    'upload.log.element': 'Élément {id}',
    'upload.log.deleteImpossible': "Suppression impossible : l'élément est utilisé par {ways} chemin(s) et {relations} relation(s), ignoré",
    'upload.log.deleteElement': "Suppression de l'élément",
    'upload.log.noCoordinates': 'Annulation, coordonnées nulles',
    'upload.log.newId': 'Nouvel identifiant {id}',
    'upload.log.deleteTag': 'Suppression du tag {key}',
    'upload.log.updateTags': 'Mise à jour des autres tags',
    'upload.log.sendElement': "Envoi de l'élément",
    'upload.log.close': 'Fermeture du groupe de modification'
}

export type MessageKey = keyof typeof fr
type Messages = Record<MessageKey, string>

const en: Messages = {
    'tab.map': 'Map',
    'tab.attributes': 'Tags',
    'tab.identify': 'Assistant',
    'tab.wiki': 'Wiki',
    'tab.upload': 'Upload',

    'natural.tree': 'Tree',
    'natural.shrub': 'Shrub',
    'natural.plant': 'Herbaceous plant',
    'combination.denotation': 'Denotation',
    'combination.denotation.none': 'None',
    'combination.denotation.landmark': 'Landmark',
    'combination.denotation.natural_monument': 'Natural monument',
    'combination.denotation.urban': 'Urban',
    'combination.denotation.park': 'Park',
    'combination.denotation.garden': 'Garden',
    'combination.denotation.agricultural': 'Agricultural',
    'combination.leaf_type': 'Leaf type',
    'combination.leaf_type.none': 'Not set',
    'combination.leaf_type.broadleaved': 'Broadleaved',
    'combination.leaf_type.needleleaved': 'Needleleaved',
    'combination.leaf_type.leafless': 'Leafless',
    'combination.leaf_cycle': 'Leaf cycle',
    'combination.leaf_cycle.none': 'Not set',
    'combination.leaf_cycle.deciduous': 'Deciduous',
    'combination.leaf_cycle.evergreen': 'Evergreen',
    'combination.leaf_cycle.semi_evergreen': 'Semi-evergreen',
    'organ.leaf': 'Leaf',
    'organ.flower': 'Flower',
    'organ.fruit': 'Fruit',
    'organ.bark': 'Bark',
    'expectedTag.species': 'species or species:xx',

    'map.osmCredit': '&copy; OpenStreetMap contributors',
    'map.newFeature': 'new feature (temporary id {id})',
    'map.autoBearing.on': 'Rotate the map with the compass: on',
    'map.autoBearing.off': 'Rotate the map with the compass: off',
    'map.switchStyle': 'Change the background map',
    'map.loading': 'Loading…',
    'map.loadError': 'Data unavailable',
    'map.retry': 'Retry',
    'map.add': 'Add a feature',
    'map.duplicate': 'Duplicate the selected feature',
    'map.confirmPosition': 'Confirm the position',
    'map.cancelPosition': 'Cancel',
    'species.unknown': 'unknown',

    'maplibre.toggleAttribution': 'Toggle attribution',
    'maplibre.mapFeedback': 'Map feedback',
    'maplibre.fullscreenEnter': 'Enter fullscreen',
    'maplibre.fullscreenExit': 'Exit fullscreen',
    'maplibre.findMyLocation': 'Find my location',
    'maplibre.locationNotAvailable': 'Location not available',
    'maplibre.logo': 'MapLibre logo',
    'maplibre.map': 'Map',
    'maplibre.marker': 'Map marker',
    'maplibre.resetBearing': 'Reset bearing to north',
    'maplibre.zoomIn': 'Zoom in',
    'maplibre.zoomOut': 'Zoom out',
    'maplibre.close': 'Close',

    'attributes.title': 'Tags',
    'attributes.key': 'Key',
    'attributes.value': 'Value',
    'attributes.loginToEdit': 'Log in to OpenStreetMap to edit the tags',
    'attributes.willBeDeleted': 'This feature will be deleted from OpenStreetMap with the next upload.',
    'attributes.restore': 'Undo deletion',
    'attributes.missingTags': 'Tags to fill in:',
    'attributes.noPosition': 'This feature has no location: it will be saved once located.',
    'attributes.locate': 'Locate',
    'attributes.move': 'Move the feature',
    'attributes.duplicatePrevious': 'Copy the tags of the previous feature',
    'attributes.done': 'Done',
    'attributes.cancel': 'Cancel',
    'attributes.delete': 'Delete',
    'attributes.confirmDeleteNew': 'Delete this new feature?',
    'attributes.confirmDelete': 'Delete this feature from OpenStreetMap?\nThe deletion will be uploaded with the next changeset.',

    'identify.naturalType': 'Main type',
    'identify.plantnet': 'Pl@ntNet identification',
    'identify.inProgress': 'Identifying…',
    'identify.error': 'The identification failed, please try again later.',
    'identify.button': 'Identify with Pl@ntNet',
    'identify.plantnetMention': 'The image-based plant species identification service is based on the Pl@ntNet recognition API, regularly updated',
    'identify.score': 'score: {score}%',

    'upload.connected': 'Connected to',
    'upload.loginRequired': 'An {osm} account is required to edit the data.',
    'upload.login': 'Log in to OpenStreetMap',
    'upload.welcome': 'Welcome',
    'upload.logout': 'Log out',
    'upload.ready': 'Features ready to upload:',
    'upload.none': 'None',
    'upload.newFeature': 'new {n}',
    'upload.deletion': ' (deletion)',
    'upload.cancelAll': 'Cancel all',
    'upload.confirmCancelAll': 'Cancel the changes of {n} feature(s)?',
    'upload.cancelledAll': 'Changes of {n} feature(s) cancelled',
    'upload.commentPlaceholder': 'changeset comment',
    'upload.send': 'Upload to OpenStreetMap',
    'upload.lastChangeset': 'Last uploaded changeset:',
    'upload.language': 'Language',
    'upload.log.start': 'Uploading {n} feature(s) to OpenStreetMap',
    'upload.log.changeset': 'Changeset created: changeset={id}',
    'upload.log.element': 'Feature {id}',
    'upload.log.deleteImpossible': 'Deletion impossible: the feature is used by {ways} way(s) and {relations} relation(s), skipped',
    'upload.log.deleteElement': 'Deleting the feature',
    'upload.log.noCoordinates': 'Skipped, no coordinates',
    'upload.log.newId': 'New id {id}',
    'upload.log.deleteTag': 'Deleting the tag {key}',
    'upload.log.updateTags': 'Updating the other tags',
    'upload.log.sendElement': 'Uploading the feature',
    'upload.log.close': 'Closing the changeset'
}

const dictionaries: Record<Lang, Messages> = { fr, en }

// translated text, with its {name} placeholders replaced by params
export const t = (key: MessageKey, params: Record<string, string | number> = {}): string =>
    dictionaries[lang][key].replace(/\{(\w+)\}/g, (match, name: string) =>
        name in params ? String(params[name]) : match)

// OSM key of the species name in the current language (written by Pl@ntNet, displayed first)
export const localizedSpeciesKey = `species:${lang}`

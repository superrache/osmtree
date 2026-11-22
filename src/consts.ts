import noneImg from './assets/no.svg'
import landmarkIcon from './assets/landmark.svg'
import naturalMonumentIcon from './assets/monument.svg'
import urbanIcon from './assets/street.svg'
import parkIcon from './assets/park.svg'
import gardenIcon from './assets/garden.svg'
import agriculturalIcon from './assets/agriculture.svg'
import naturalTreeIcon from './assets/natural_tree.svg'
import naturalShrubIcon from './assets/natural_shrub.svg'
import naturalPlantIcon from './assets/natural_plant.svg'
import needleIcon from './assets/needle.svg'
import cactusIcon from './assets/cactus.svg'
import deciduousIcon from './assets/deciduous.svg'
import evergreenIcon from './assets/evergreen.svg'
import leafImg from './assets/leaf.svg'
import flowerImg from './assets/flower.svg'
import fruitImg from './assets/fruit.svg'
import barkImg from './assets/bark.svg'
import { Combination, ExpectedTag, NaturalType, Organ } from './types'
import { t } from './i18n'

export const naturalTypes: Record<string, NaturalType> = {
    'tree': {
        icon: naturalTreeIcon,
        color: '#7cb26f',
        label: t('natural.tree')
    },
    'shrub': {
        icon: naturalShrubIcon,
        color: '#2e856f',
        label: t('natural.shrub')
    },
    'plant': {
        icon: naturalPlantIcon,
        color: '#7ce448',
        label: t('natural.plant')
    }
}

// expected tags, shown by the completeness pie drawn behind each marker:
// one share per entry, filled when one of the keys it matches is set
// (key: added to the attributes table by a click on the missing tag)
export const expectedTags: ExpectedTag[] = [
    { label: 'leaf_type', key: 'leaf_type', pattern: /^leaf_type$/ },
    { label: 'leaf_cycle', key: 'leaf_cycle', pattern: /^leaf_cycle$/ },
    { label: 'species:wikidata', key: 'species:wikidata', pattern: /^species:wikidata$/ },
    { label: t('expectedTag.species'), key: 'species', pattern: /^species(:[a-z]{2,3}([-_][A-Za-z]+)?)?$/ }, // any language
    { label: 'genus', key: 'genus', pattern: /^genus$/ }
]

// specific to one feature: never copied to another one (Dupliquer)
export const notDuplicatedKeys = [
    'name',
    'ref',
    'note',
    'fixme',
    'description',
    'image',
    'wikidata',
    'wikipedia',
    'survey:date',
    'check_date'
]

export const combinations: Record<string, Combination> = {
    'denotation': {
        label: t('combination.denotation'),
        key: 'denotation',
        natural: ['tree'],
        values: {
            'none': {
                icon: noneImg,
                label: t('combination.denotation.none')
            },
            'landmark': {
                icon: landmarkIcon,
                label: t('combination.denotation.landmark')
            },
            'natural_monument': {
                icon: naturalMonumentIcon,
                label: t('combination.denotation.natural_monument')
            },
            'urban': {
                icon: urbanIcon,
                label: t('combination.denotation.urban')
            },
            'park': {
                icon: parkIcon,
                label: t('combination.denotation.park')
            },
            'garden': {
                icon: gardenIcon,
                label: t('combination.denotation.garden')
            },
            'agricultural': {
                icon: agriculturalIcon,
                label: t('combination.denotation.agricultural')
            }
        }
    },
    'leaf_type': {
        label: t('combination.leaf_type'),
        key: 'leaf_type',
        natural: ['tree', 'shrub'],
        values: {
            'none': {
                label: t('combination.leaf_type.none'),
                icon: noneImg
            },
            'broadleaved': {
                label: t('combination.leaf_type.broadleaved'),
                icon: leafImg
            },
            'needleleaved': {
                label: t('combination.leaf_type.needleleaved'),
                icon: needleIcon
            },
            'leafless': {
                label: t('combination.leaf_type.leafless'),
                icon: cactusIcon
            }
        }
    },
    'leaf_cycle': {
        label: t('combination.leaf_cycle'),
        key: 'leaf_cycle',
        natural: ['tree', 'shrub', 'plant'],
        values: {
            'none': {
                label: t('combination.leaf_cycle.none'),
                icon: noneImg
            },
            'deciduous': {
                label: t('combination.leaf_cycle.deciduous'),
                icon: deciduousIcon
            },
            'evergreen': {
                label: t('combination.leaf_cycle.evergreen'),
                icon: evergreenIcon
            },
            'semi_evergreen': {
                label: t('combination.leaf_cycle.semi_evergreen'),
                icon: agriculturalIcon
            }
        }
    }
}

export const organs: Record<string, Organ> = {
    'leaf': {icon: leafImg, label: t('organ.leaf')},
    'flower': {icon: flowerImg, label: t('organ.flower')},
    'fruit': {icon: fruitImg, label: t('organ.fruit')},
    'bark': {icon: barkImg, label: t('organ.bark')}
}

const devOsmConfig = {
    scope: "read_prefs write_api",
    client_id: '6wbgf9PZVtE6dBsN8dNkT2668d43gW7-A_ln5hAFdag',
    redirect_uri: window.location.origin.replace('localhost', '127.0.0.1'), // !important: osm-auth allows only this host for http (not 'localhost')
    url: 'https://master.apis.dev.openstreetmap.org',
    apiUrl: 'https://master.apis.dev.openstreetmap.org',
    auto: true,
    singlepage: true
}

const prodOsmConfig = {
    scope: "read_prefs write_api",
    client_id: 'LKw3VHQ3kkgbFZSO-8OAZdfZ6c21nGAJMKKlm9nGSEo',
    redirect_uri: window.location.origin.replace('localhost', '127.0.0.1'), // !important: osm-auth allows only this host for http (not 'localhost')
    url: 'https://www.openstreetmap.org',
    apiUrl: 'https://api.openstreetmap.org',
    auto: true,
    singlepage: true
}

// set VITE_OSM_ENV=dev to target the OSM dev API (master.apis.dev.openstreetmap.org)
export const osmConfig = import.meta.env.VITE_OSM_ENV === 'dev' ? devOsmConfig : prodOsmConfig

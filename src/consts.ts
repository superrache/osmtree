import noDenotationIcon from './assets/no.svg'
import landmarkIcon from './assets/landmark.svg'
import naturalMonumentIcon from './assets/monument.svg'
import urbanIcon from './assets/street.svg'
import agriculturalIcon from './assets/agriculture.svg'
import naturalTreeIcon from './assets/natural_tree.svg'
import naturalShrubIcon from './assets/natural_shrub.svg'
import naturalPlantIcon from './assets/natural_plant.svg'
import leafImg from './assets/leaf.svg'
import flowerImg from './assets/flower.svg'
import fruitImg from './assets/fruit.svg'
import barkImg from './assets/bark.svg'
import { DenotationType, NaturalType, Organ } from './types'

export const naturalTypes: Record<string, NaturalType> = {
    'tree': {
        icon: naturalTreeIcon,
        color: '#7cb26f',
        label: 'Arbre'
    },
    'shrub': {
        icon: naturalShrubIcon,
        color: '#2e856f',
        label: 'Arbuste'
    },
    'plant': {
        icon: naturalPlantIcon,
        color: '#7ce448',
        label: 'Herbacée'
    }
}

export const denotationTypes: Record<string, DenotationType> = {
    'no': {
        icon: noDenotationIcon,
        label: 'Aucun'
    },
    'landmark': {
        icon: landmarkIcon,
        label: 'Repère géographique'
    },
    'natural_monument': {
        icon: naturalMonumentIcon,
        label: 'Monument naturel'
    },
    'urban': {
        icon: urbanIcon,
        label: 'Urbain'
    },
    'agricultural': {
        icon: agriculturalIcon,
        label: 'Agricole'
    }
}

export const organs: Record<string, Organ> = {
    'leaf': {icon: leafImg, label: 'Feuille'},
    'flower': {icon: flowerImg, label: 'Fleur'},
    'fruit': {icon: fruitImg, label: 'Fruit'},
    'bark': {icon: barkImg, label: 'Écorce'}
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

export const osmConfig = prodOsmConfig

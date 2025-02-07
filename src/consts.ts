import naturalTreeIcon from './assets/natural_tree.svg'
import naturalShrubIcon from './assets/natural_shrub.svg'
import naturalPlantIcon from './assets/natural_plant.svg'
import leafImg from './assets/leaf.svg'
import flowerImg from './assets/flower.svg'
import fruitImg from './assets/fruit.svg'
import barkImg from './assets/bark.svg'
import { NaturalType, Organ } from './types'

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

export const organs: Record<string, Organ> = {
    'leaf': {icon: leafImg, label: 'Feuille'},
    'flower': {icon: flowerImg, label: 'Fleur'},
    'fruit': {icon: fruitImg, label: 'Fruit'},
    'bark': {icon: barkImg, label: 'Écorce'}
}

export const osmConfig = {
    scope: "read_prefs write_api",
    client_id: 'LKw3VHQ3kkgbFZSO-8OAZdfZ6c21nGAJMKKlm9nGSEo',
    redirect_uri: window.location.origin.replace('localhost', '127.0.0.1'), // !important: osm-auth allows only this host for http (not 'localhost')
    url: 'https://www.openstreetmap.org',
    apiUrl: 'https://api.openstreetmap.org',
    auto: true,
    singlepage: true
}
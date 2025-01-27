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
        label: 'Arbre',
        selected: true,
    },
    'shrub': {
        icon: naturalShrubIcon,
        color: '#2e856f',
        label: 'Arbuste',
        selected: false
    },
    'plant': {
        icon: naturalPlantIcon,
        color: '#7ce448',
        label: 'Herbacée',
        selected: false
    }
}

export const organs: Record<string, Organ> = {
    'leaf': {selected: true, icon: leafImg, label: 'Feuille'},
    'flower': {selected: false, icon: flowerImg, label: 'Fleur'},
    'fruit': {selected: false, icon: fruitImg, label: 'Fruit'},
    'bark': {selected: false, icon: barkImg, label: 'Écorce'}
}
import naturalTreeIcon from './assets/natural_tree.svg'
import naturalShrubIcon from './assets/natural_shrub.svg'
import naturalPlantIcon from './assets/natural_plant.svg'
import { NaturalType } from './types'

export const naturalTypes: Record<string, NaturalType> = {
    'tree': {
        tag: 'tree',
        icon: naturalTreeIcon,
        color: '#7cb26f',
        label: 'Arbre',
        selected: true,
    },
    'shrub': {
        tag: 'shrub',
        icon: naturalShrubIcon,
        color: '#2e856f',
        label: 'Arbuste',
        selected: false
    },
    'plant': {
        tag: 'plant',
        icon: naturalPlantIcon,
        color: '#7ce448',
        label: 'Plante',
        selected: false
    }
}
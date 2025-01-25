import { TreeMarkerStyle } from "./types";
import leafTypeBroadleavedIcon from './assets/leaf_type_broadleaved.svg'
import leafTypeNeedleleavedIcon from './assets/leaf_type_needleleaved.svg'
import leafTypeUnknownIcon from './assets/leaf_type_unknown.svg'

export const leafTypeStyles: Record<string, TreeMarkerStyle> = {
    'broadleaved': {
        icon: leafTypeBroadleavedIcon,
        color: '#7cb26f'
    },
    'needleleaved': {
        icon: leafTypeNeedleleavedIcon,
        color: '#2e856f'
    },
    'unknown': {
        icon: leafTypeUnknownIcon,
        color: '#d68940'
    }
}
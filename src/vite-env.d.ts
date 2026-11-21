/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Overpass interpreter URL(s), comma separated, overriding the public servers */
    readonly OVERPASS_URL?: string
    /** 'dev' to use the OSM dev API instead of production */
    readonly VITE_OSM_ENV?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

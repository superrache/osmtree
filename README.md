# osmtree

A web app to map **trees, shrubs and plants** in [OpenStreetMap](https://www.openstreetmap.org), right in the field.

The app is designed **mobile first**: it is meant to be used on a phone, while walking, with geolocation, the compass and the camera. There is no desktop-specific layout: it still works in a desktop browser, but with the mobile interface.

## Features

- **Map**: displays `natural=tree`, `natural=shrub` and `natural=plant` nodes (loaded from Overpass from zoom 16), on top of IGN orthophotos or a Jawg map. Geolocation and automatic map rotation following the phone's compass.
- **Identification**: take a photo of a leaf, flower, fruit or bark, then identify the species with the [Pl@ntNet](https://my.plantnet.org) API. The chosen candidate fills in `species`, `genus`, `species:fr`, `species:wikidata` (found on Wikidata from the GBIF id returned by Pl@ntNet) and `check_date`.
- **Assistant**: choice of the type (tree, shrub, plant) and of common tag combinations (`denotation`, `leaf_type`, `leaf_cycle`).
- **Attribute editing**: add, modify and delete tags, with key and value autocompletion from [taginfo](https://taginfo.openstreetmap.org).
- **Creating and moving** features with a crosshair at the center of the map.
- **Wiki**: Wikipedia page of the selected species.
- **Upload**: log in to an OSM account (OAuth2) and upload all validated changes in a single changeset, with an automatically generated comment.

## Architecture

- **Client**: React 19, TypeScript, Vite 8 and MapLibre GL. Overpass, taginfo, OSM and Wikipedia are called directly from the browser.
- **Serverless**: a Cloudflare Worker (`worker/index.ts`) serves the client's static files and a single API route, `POST /api/plantnet-identify`. It forwards the photo to Pl@ntNet so that the API key stays on the server side.

```
src/            React client (tabs, map, editing, OSM upload)
worker/         Cloudflare Worker (/api/plantnet-identify route)
public/         static files copied as is
wrangler.toml   Worker and static files configuration
```

## Requirements

- Node.js ≥ 22.12
- A [Pl@ntNet](https://my.plantnet.org) API key for identification

## Installation and development

```bash
npm install
echo "PLANTNET_API_KEY=your_key" > .dev.vars   # Pl@ntNet key for the local Worker (file ignored by git)
npm run dev
```

`npm run dev` starts the Vite client on http://127.0.0.1:5173 and the Worker (`wrangler dev`) on port 8788. Vite proxies `/api` to the Worker.

> Open **http://127.0.0.1:5173**: the OSM login (OAuth2) only accepts `127.0.0.1` over http.

To test on a phone, geolocation, the compass and the OSM login require a secure origin (https). The easiest way is to use a preview URL of the deployment.

### Scripts

| Command              | Purpose                                                       |
| -------------------- | ------------------------------------------------------------- |
| `npm run dev`        | Vite client + local Worker                                    |
| `npm run dev:client` | Vite client only                                              |
| `npm run dev:worker` | local Worker only                                             |
| `npm run typecheck`  | type checking (client and Worker)                             |
| `npm run lint`       | ESLint                                                        |
| `npm run build`      | type checking, then client build into `dist/`                 |
| `npm run preview`    | build, then local Worker serving `dist/`, as in production    |
| `npm run deploy`     | build, then manual deployment with `wrangler deploy`          |

## Environment variables

See [`.env.example`](.env.example).

| Variable           | Read                     | Purpose                                                                                                                  |
| ------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `PLANTNET_API_KEY` | at runtime, by the Worker | Pl@ntNet API key. Locally in `.dev.vars`, in production as a Worker secret.                                              |
| `VITE_OSM_ENV`     | at build time, by Vite   | `dev` to upload changes to the OSM test API (`master.apis.dev.openstreetmap.org`) instead of production.                 |
| `OVERPASS_URL`     | at build time, by Vite   | Overpass interpreter URL(s), comma-separated, to use instead of the public servers. The server must allow CORS.          |

Variables read at build time must be defined in the build environment (`.env` file locally, Cloudflare build variables in production), not only at runtime.

> ⚠️ By default, the app publishes to the **production OpenStreetMap**. To try uploads, use `VITE_OSM_ENV=dev` with an account on the test API.

## Credits

- Data: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, ODbL
- Identification: [Pl@ntNet](https://plantnet.org)
- Base maps: [IGN](https://geoservices.ign.fr) BD ORTHO®, [Jawg Maps](https://www.jawg.io)

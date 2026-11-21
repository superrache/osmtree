# osmtree

Application web pour cartographier les **arbres, arbustes et plantes** dans [OpenStreetMap](https://www.openstreetmap.org), directement sur le terrain.

L'application est pensée **mobile first** : elle s'utilise au téléphone, en marchant, avec la géolocalisation, la boussole et l'appareil photo. Il n'existe pas de mise en page spécifique pour ordinateur : elle reste utilisable dans un navigateur de bureau, mais avec l'interface mobile.

## Fonctionnalités

- **Carte** : affichage des nœuds `natural=tree`, `natural=shrub` et `natural=plant` (chargés via Overpass à partir du zoom 16), sur fond d'orthophotos IGN ou de carte Jawg. Géolocalisation et orientation automatique de la carte selon la boussole du téléphone.
- **Identification** : prise de photo d'une feuille, d'une fleur, d'un fruit ou d'une écorce, puis identification de l'espèce par l'API [Pl@ntNet](https://my.plantnet.org). Le candidat choisi renseigne `species`, `genus`, `species:fr` et `survey:date`.
- **Assistant** : choix du type (arbre, arbuste, plante) et de combinaisons courantes de tags (`denotation`, `leaf_type`, `leaf_cycle`).
- **Édition des attributs** : ajout, modification et suppression de tags, avec autocomplétion des clés et valeurs depuis [taginfo](https://taginfo.openstreetmap.org).
- **Création et déplacement** d'éléments avec un réticule au centre de la carte.
- **Wiki** : fiche Wikipédia de l'espèce sélectionnée.
- **Envoi** : connexion au compte OSM (OAuth2) et envoi de toutes les modifications validées dans un seul changeset, avec un commentaire généré automatiquement.

## Architecture

- **Client** : React 19, TypeScript, Vite 8 et MapLibre GL. Overpass, taginfo, OSM et Wikipédia sont appelés directement depuis le navigateur.
- **Serverless** : un Worker Cloudflare (`worker/index.ts`) sert les fichiers statiques du client et une seule route d'API, `POST /api/plantnet-identify`. Celle-ci relaie la photo vers Pl@ntNet pour que la clé d'API reste côté serveur.

```
src/            client React (onglets, carte, édition, envoi OSM)
worker/         Worker Cloudflare (route /api/plantnet-identify)
public/         fichiers statiques copiés tels quels
wrangler.toml   configuration du Worker et des fichiers statiques
```

## Prérequis

- Node.js ≥ 22.12
- Une clé d'API [Pl@ntNet](https://my.plantnet.org) pour l'identification
- Un compte Cloudflare pour le déploiement

## Installation et développement

```bash
npm install
echo "PLANTNET_API_KEY=votre_cle" > .dev.vars   # clé Pl@ntNet pour le Worker local (fichier ignoré par git)
npm run dev
```

`npm run dev` lance le client Vite sur http://127.0.0.1:5173 et le Worker (`wrangler dev`) sur le port 8788. Vite redirige `/api` vers le Worker.

> Ouvrez bien **http://127.0.0.1:5173** et non `localhost` : la connexion OSM (OAuth2) n'accepte que `127.0.0.1` en http.

Pour tester sur un téléphone, la géolocalisation, la boussole et la connexion OSM exigent une origine sécurisée (https). Le plus simple est d'utiliser une URL de preview du déploiement (voir plus bas).

### Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | client Vite + Worker local |
| `npm run dev:client` | client Vite seul |
| `npm run dev:worker` | Worker local seul |
| `npm run typecheck` | vérification des types (client et Worker) |
| `npm run lint` | ESLint |
| `npm run build` | vérification des types puis build du client dans `dist/` |
| `npm run preview` | build puis Worker local servant `dist/`, comme en production |
| `npm run deploy` | build puis déploiement manuel avec `wrangler deploy` |

## Variables d'environnement

Voir [`.env.example`](.env.example).

| Variable | Lue | Rôle |
|---|---|---|
| `PLANTNET_API_KEY` | à l'exécution, par le Worker | clé d'API Pl@ntNet. En local dans `.dev.vars`, en production comme secret du Worker. |
| `VITE_OSM_ENV` | au build, par Vite | `dev` pour envoyer les modifications sur l'API de test OSM (`master.apis.dev.openstreetmap.org`) au lieu de la production. |
| `OVERPASS_URL` | au build, par Vite | URL(s) d'interpréteur Overpass, séparées par des virgules, à utiliser à la place des serveurs publics. Le serveur doit autoriser le CORS. |

Les variables lues au build doivent être définies dans l'environnement de build (fichier `.env` en local, variables de build de Cloudflare en production), pas seulement à l'exécution.

> ⚠️ Par défaut, l'application publie sur **l'OpenStreetMap de production**. Pour faire des essais d'envoi, utilisez `VITE_OSM_ENV=dev` avec un compte sur l'API de test.

## Déploiement

L'application est déployée sur **Cloudflare Workers** par Workers Builds, connecté au dépôt GitHub :

| Réglage | Valeur |
|---|---|
| Nom du Worker | `osmtree` (doit correspondre au `name` de `wrangler.toml`) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` |

Chaque push sur `main` déploie en production sur `osmtree.<sous-domaine>.workers.dev`. Les autres branches produisent une URL de preview. La connexion OSM n'y fonctionne pas, car leur URL n'est pas déclarée dans l'application OAuth.

À configurer une fois :

1. Le secret Pl@ntNet : `npx wrangler secret put PLANTNET_API_KEY`, ou dans le dashboard du Worker (Settings, puis Variables and Secrets, en type Secret).
2. L'URL de production dans les **Redirect URIs** de l'application OAuth2 sur openstreetmap.org (et sur l'API de test si `VITE_OSM_ENV=dev`).

## Contribuer

- TypeScript strict, composants React fonctionnels, un fichier CSS par composant.
- Mobile first : concevoir et tester les écrans pour un téléphone en mode portrait. Pas de style spécifique desktop.
- Indentation de 4 espaces, pas de point-virgule.
- Interface et messages utilisateur en français.
- Commits au format conventionnel : `feat: ...`, `fix: ...`, `chore: ...`.

Le projet n'a pas encore de tests automatisés. Avant de proposer une modification, lancez au minimum `npm run build`.

## Crédits

- Données : © les contributeurs d'[OpenStreetMap](https://www.openstreetmap.org/copyright), ODbL
- Identification : [Pl@ntNet](https://plantnet.org)
- Fonds de carte : [IGN](https://geoservices.ign.fr) BD ORTHO®, [Jawg Maps](https://www.jawg.io)

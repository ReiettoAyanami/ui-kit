# ui-kit

lenzi's Angular component kit, **`@lenzi/ui-kit`**, and its **catalog**. Angular Material 3, heavily
modified: dark violet on neutral greys, glass, 2 px borders, Roboto Mono. The components come from
substance-tracker and vtiger-reader, so every new app starts from the same pieces and the same rules.

- **The rules** of the look: [`projects/kit/RULES.md`](projects/kit/RULES.md)
- **The instructions for Claude**: [`projects/kit/AI-RULES.md`](projects/kit/AI-RULES.md)
- **Every piece**: its `README.md` (rules, API) and `AI.md` (notes for Claude) next to its code
- **The libraries** the frontends use, with their rules: [`projects/kit/libraries.json`](projects/kit/libraries.json)

## Run the catalog

```sh
npm install
npm start          # http://localhost:4300 (and the kit's server on 127.0.0.1:4301)
```

The catalog has a page per piece: a live demo with its parameters (phone or desktop width), its rules,
its AI notes, its real code and the global variables it uses. The **Variables** page changes the global
variables live and saves them into `projects/kit/src/styles/tokens.json` and `tokens.css`.

## Docker

```sh
docker compose up -d --build                  # the catalog as deployed: http://localhost:8080
docker compose -f compose.dev.yaml up         # development in a container, the repo mounted: http://localhost:4300
```

The image (`Dockerfile`) builds the library and the catalog, then serves the catalog with the kit's
server (Fastify) on port 8080; there the variables are read only. The CI (`.github/workflows/ci.yml`)
runs the tests and the builds, then builds the image, starts it and asks it for pages, at every push:
the catalog is always deployable.

## Scripts

| Script | What it does |
| --- | --- |
| `npm start` | the catalog in development, with the server that saves the variables |
| `npm test` | the library's tests, the catalog's, the server's, and that every page has its files |
| `npm run build` | the package (`dist/kit`) and the catalog (`dist/catalog`) |
| `npm run pack` | the package as a tarball (`dist/lenzi-ui-kit-<version>.tgz`), for `ng add` |
| `npm run tokens` | `tokens.css` again from `tokens.json` |
| `npm run libraries` | the versions in `libraries.json`, read again from the kit, substance-tracker and vtiger-reader |
| `npm run serve:prod` | the built catalog served as in Docker, on port 8080 |

## How an app takes the kit

Like Angular Material: one command sets it up.

```sh
ng add @lenzi/ui-kit                # from a registry, once it is published
ng add "@lenzi/ui-kit@file:../ui-kit/dist/lenzi-ui-kit-0.1.0.tgz"   # today, after `npm run pack`
```

`ng add` (the kit's schematic, `projects/kit/schematics/ng-add`) adds the peer dependencies that are
missing (Material, the CDK, the fonts), puts the kit's styles first in `angular.json`, and adds
`provideLenziKit({ appId })` and `provideHttpClient(withFetch(), withInterceptors([lenziErrorInterceptor]))`
to `app.config.ts`. Run twice, it changes nothing. Then it is a classic Angular library:

```ts
import { LenziAppShell, LenziNavList, LenziAddButton } from '@lenzi/ui-kit';
import { LenziChart } from '@lenzi/ui-kit/charts';
```

Entry points: `@lenzi/ui-kit` (components, services, utilities), `@lenzi/ui-kit/charts` (ECharts),
`@lenzi/ui-kit/three` (three.js), `@lenzi/ui-kit/http` (API errors).

## Adding a piece to the kit

1. `npx ng generate component lib/<name> --project kit` (then move it out of `lib/lib/`, the CLI nests
   library paths), never by hand.
2. Its code, its tests (`ng test kit`), its `README.md` (what, when, rules, API, example) and its `AI.md`
   (notes for Claude), next to it.
3. Export it from `projects/kit/src/public-api.ts` (or its entry point's).
4. Its demo: `npx ng generate component demos/<name>-demo --project catalog`, and its entry in
   `projects/catalog/src/app/registry.ts` (parameters, usage, files).
5. `npm test` (it fails when a page misses a file), `npm run build`, then look at its page.

## Layout

```
projects/kit/              the package @lenzi/ui-kit
  RULES.md, AI-RULES.md    the rules of the look, the instructions for Claude
  libraries.json           the frontend libraries and their rules
  src/lib/<piece>/         a component: code, tests, README.md, AI.md
  src/styles/              kit.scss, _theme.scss, global.css, tokens.json → tokens.css, fonts.css, docs/
  charts/ three/ http/     the secondary entry points
projects/catalog/          the catalog app (demos, pages, registry)
server/                    the kit's server: saves the variables (development), serves the catalog (Docker)
tools/                     the dev launcher, the libraries' versions, the documents' test
```

## Licence

Unlicense, like vtiger-reader.

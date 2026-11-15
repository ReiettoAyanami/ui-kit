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
its AI notes, its real code and the global variables it uses. **Everything shown as code or configuration
can be changed there, and takes effect:**

- **Playground**: the parameters, or the usage code itself (editing it moves the parameters and the demo).
- **Rules** and **AI notes**: `Read | Edit`; saved into the piece's `README.md` and `AI.md`. The Rules and
  AI rules pages do the same for `RULES.md` and `AI-RULES.md`.
- **Code**: the piece's real files, saved into the kit; the catalog rebuilds with them.
- **Variables** (a piece's tab, and the page with all of them): one control per variable, or all of them
  as CSS text (`Controls | Text`); a change applies at once everywhere, and is saved into
  `projects/kit/src/styles/tokens.json` and `tokens.css`. A colour is changed from the colour itself: a
  click opens the colour selector (`LenziColorPicker`).
- **Libraries**: `libraries.json`.
- **History**: what differs from the kit in this browser, every change made in it, and every save into
  the kit (kept by the server), each with its way back.

## The admin

Everyone reads the pages the admin shows them; **only the admin saves into the kit**. The admin is one user and one password in the server's environment: copy `.env.example` to
`.env` (never in the repo), set `KIT_ADMIN_USER` and `KIT_ADMIN_PASSWORD`, start the server, and sign in
on the catalog's **Admin** page. Without them nobody can sign in and nothing is saved.

| Signed in on | Variables and colours | The kit's files (code, rules, AI notes, libraries) |
| --- | --- | --- |
| `npm start` | saved into `tokens.json` and `tokens.css` | saved into the repo; the catalog rebuilds |
| Docker | saved on the fly, for every visitor (kept in the volume, apart from the image) | read only: they need a new build |

**What the public sees.** The catalog itself is always public: the overview, the list of the components and
each of their pages. The other pages (Rules, AI rules, Variables, Libraries, History) are the admin's to
show or hide, one toggle each on the Admin page. Which pages exist is said in one place,
`projects/catalog/src/app/site-map.ts` (the fixed pages) with the registry (one page per piece): the routes,
the Admin page's list and the server's list all come from it, so a new page is everywhere by itself.

A hidden page is out of the menu, its address says "not found", and **the deployed server is closed by
default**: `npm run build` writes `dist/site-pages.json` (every page with the files it reads), and of the
kit's files and of what the pages read, the public is given only what a public page reads. The documents of
a hidden page, a file no page shows, a new file: the admin's alone. Nothing of those pages' content is in
the catalog's JavaScript (they are fetched when the page opens), so hidden means unreachable. While
Variables is hidden, a component's Variables tab still works: the public gets names and values, not what
each is for and why. The choice is kept in `.kit/pages.json` (development) or the volume (Docker). In
development the kit's files are served by `ng serve`, not by this server: the refusal is the deployed one's.

**What a visitor can change.** Only a component's playground (its parameters, its usage code) and the
variables the piece uses, only in their browser, and only until the page is loaded again. Everything else is
read only for them: no Edit side on rules, AI notes or code, anywhere. The admin's unsaved changes are kept by the browser, as before.

**The admin's scenes.** Everyone makes scenes in the scene maker and shares them by a link (the scene is in
the link). Signed in, the maker also has **Save**: the scene is kept on the server (`.kit/scenes.json` in
development, the volume in Docker) and shown in the gallery of the Scenes page, the admin's alone
(`/api/scenes` answers only the admin): a card per scene, its scene in a frame that plays while the card is
pointed at; a tap opens it in the maker, where Save saves it again. A deleted scene is marked in the file,
not erased.

Every save is kept (`.kit/history.jsonl` in development, the volume in Docker) and can be undone from
the History page. Variables changed in the deployed catalog stay in its volume: to make them the kit's
own, copy them from its Variables page (`Text`) into the repo's, and save there.

## Docker

```sh
docker compose up -d --build                  # the catalog as deployed: http://localhost:8080
docker compose -f compose.dev.yaml up         # development in a container, the repo mounted: http://localhost:4300
```

The image (`Dockerfile`) builds the library and the catalog, then serves the catalog with the kit's
server (Fastify) on port 8080. With the admin of `.env` signed in, the variables are changed there on the
fly (volume `catalog-data`); the kit's files are not. Behind a proxy with https, set `TRUST_PROXY=true`. The CI (`.github/workflows/ci.yml`)
runs the tests and the builds, then builds the image, starts it and asks it for pages, at every push:
the catalog is always deployable.

## Scripts

| Script | What it does |
| --- | --- |
| `npm start` | the catalog in development, with the server that saves the variables and the kit's files for the admin (`.env`) |
| `npm test` | the library's tests, the catalog's, the server's, and that every page has its files |
| `npm run build` | the package (`dist/kit`), the catalog (`dist/catalog`) and the list of its pages for the server (`dist/site-pages.json`) |
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
server/                    the kit's server: the admin's sign-in, the variables and the kit's files saved, their history; serves the catalog (Docker)
tools/                     the dev launcher, the libraries' versions, the list of the pages, the documents' test
```

## Licence

Unlicense, like vtiger-reader.

# AI rules

Instructions for Claude, for any frontend work in lenzi's projects. lenzi does not want to correct the
same things twice: these rules exist so that the first version is already right. Read this file, then
`RULES.md`, then the `README.md` and `AI.md` of every piece you are going to use. They are next to the
code: `projects/kit/src/lib/<piece>/`, `projects/kit/charts/src/chart/`, `projects/kit/three/src/three-canvas/`,
`projects/kit/http/src/`, and `projects/kit/src/styles/docs/<topic>/` for the styles. In an app that
installed the kit, the same files are in `node_modules/@lenzi/ui-kit/` (`docs/`, `styles/docs/`).

## Before writing anything

1. **Know what exists.** Open the catalog (`npm start` in `Projects/ui-kit`, then
   `http://localhost:4300/components`), or list `projects/kit/src/lib/` and the other entry points.
   Most of what a page needs is already there.
2. **Read the rules of the pieces you use**: their README (what, when, rules, API) and their AI notes
   (how to wire them, what never to do).
3. **Name the pieces in your plan**: "the page is a LenziAppShell route with a LenziSearchBar, a
   LenziDataTable and a LenziAddButton", before code.

## A new app

`ng add @lenzi/ui-kit` (or `ng add "@lenzi/ui-kit@file:<tarball>"` before it is published): it sets up the
styles, the fonts, `provideLenziKit({ appId })` and the interceptor. Then the app's shell is a
`LenziAppShell` with a `LenziNavList`, and every page is a lazy route.

## Kit first

- **Compose, do not invent.** A page is the kit's components and Material's, laid out with a little CSS
  of its own (grid, flex, gaps, widths). Nothing else.
- **Never restyle** a kit component or a Material component in an app: no `::ng-deep` into them, no
  overriding their tokens, no new colours, radii, borders, shadows or fonts. If it must look different,
  it is a kit change: say so to lenzi.
- **Never copy kit code into an app.** Import it from `@lenzi/ui-kit`.
- **A piece that does not exist yet:**
  - generic (another app could use it: a calendar grid, a file picker, a month switcher): **add it to
    the kit first**, with `ng generate` in `projects/kit`, its `README.md` and `AI.md`, tests, a demo
    and an entry in the catalog's registry (`projects/catalog/src/app/registry.ts`); then use it.
  - specific to one app (a substance card): build it in the app, from kit pieces and the theme's
    variables, following `RULES.md`.
- **Values come from variables**: `var(--mat-sys-…)` for colours and type, `var(--lenzi-…)` for the
  kit's sizes, radii, glass, motion. Never a hex colour or a magic number that a variable already has.

## The rules that are easiest to get wrong

- Figures: **name bold on top, value under** (`LenziFigure`); **never two data on one line joined by "·"**.
- **Whole words** on every button and toggle; the interface in the app's language (English so far).
- **Dark only.** Do not add a light theme or follow the system's.
- **One "+" per page** (`LenziAddButton`), bottom right, for its one way of adding.
- **Toggles: 32 px pills**; search bars: elongated circles (`LenziSearchBar`), and only search bars.
- **A colour the user may change is its own picker** (`LenziColorPicker`): the swatch opens the selector;
  never `<input type="color">`, never a button beside the colour. Save on `(picked)`.
- **Dialogs open with `LenziDialogs`** (the back button closes them); destructive actions with
  `LenziConfirmDialog`; save buttons disabled on tap.
- **Empty, loading, failed**: `LenziStatusMessage`, with `couldNotLoad()` for failures.
- **The server computes**: never derive a domain number in the browser; extend the API.
- **Comfortable at 390 px**, never a horizontal scroll of the page.

## How to work

- **`ng generate` for every Angular artifact**, never by hand (lenzi, 2026-09-29). Announce the
  command.
- **Code in English**; talk to lenzi in Italian, informally.
- **Test what you build**: unit tests of the behaviour (`ng test`), and **look at it before
  presenting it**: render the page headless (Windows Chrome from WSL, see the brain's notes), at 390 px
  and at 1280 px, and measure (no overflow, the borders, the contrast). Never present a visual change
  you have not seen.
- **Present a finished result in one go**, with what you chose and what lenzi should try.
- **When an approved design exists, implement it fully**; do not drift with choices of your own.
- **Never push, publish or release without asking.** Commit on the working branch (`dev`).

## Changing the kit

- **A rule changes only when lenzi says so.** Write the new rule in `RULES.md` (and in the piece's
  README) with the date and lenzi's words.
- **A global variable** changes from the catalog's Variables page (it saves into `tokens.json` and
  regenerates `tokens.css`), or in `tokens.json` followed by `npm run tokens`. Never edit `tokens.css`.
- **A component's API** (an input, an output, a selector) is a contract for every app: change it with
  care, update its README, AI notes, demo and usage, and tell lenzi which apps must follow.
- **A new library**: not without lenzi's yes; then it goes in `libraries.json` with its role and rules.
- **lenzi changes the kit from the catalog too** (2026-11-12: code and configuration "must be put into a
  code-like textarea where the user can edit, and they will take effect"). With `npm start`, signed in on
  the **Admin** page (2026-11-12: "pagina admin per abilitare la modifica (unico utente)"): the **Code**
  tab saves a piece's files, **Rules** and **AI notes** save its `README.md` and `AI.md` (the Rules and AI
  rules pages save these two documents), **Variables** saves the tokens, the Libraries page saves
  `libraries.json`; the **History** page lists every save and undoes it. So a file may have changed since you last read it: read it again before editing, and
  never write over what he wrote.
- After a change: `npm test`, `npm run build`, then look at the catalog.

## Where things are

| What | Where |
| --- | --- |
| The look's rules | `projects/kit/RULES.md` |
| These instructions | `projects/kit/AI-RULES.md` |
| A piece's rules and API | `README.md` next to its code |
| A piece's notes for Claude | `AI.md` next to its code |
| The global variables | `projects/kit/src/styles/tokens.json` |
| The libraries and their rules | `projects/kit/libraries.json` |
| The catalog's list of pages | `projects/catalog/src/app/registry.ts` |
| The design of the kit | the brain: `wiki/projects/ui-kit/design.md` |

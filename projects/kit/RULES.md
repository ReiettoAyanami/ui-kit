# Rules

The look and the behaviour of every app built with the kit: **Angular Material 3, heavily modified**.
They come from substance-tracker's frontend design (`wiki/projects/substance-tracker/design-frontend.md`,
2026-09-29 → 2026-10-10), where lenzi asked for each of them; the quotes are the reasons, keep them with
the rules. A rule changes only when lenzi says so, and the change is written here with its date.

Every value below lives in a global variable (`styles/tokens.json`, the catalog's **Variables** page):
the rule says what, the variable says how much.

## Material, and nothing else

- **Angular Material 3 is the only UI library.** No Tailwind, no Bootstrap, no other component library.
  Our own CSS only for layout and for what Material does not have (a segmented bar, identity colours).
- **The kit modifies Material once, globally** (`styles/global.css`). An app never restyles a Material
  component locally: if something must look different everywhere, it changes in the kit.
- **Kit first.** An app composes the kit's components and Material's. A piece that more than one app
  could use is added to the kit (with its page, rules and AI notes) before an app uses it.

## Theme

- **Dark only**, violet on neutral greys, "like Obsidian" (lenzi, 2026-10-02: "Come in foto, quindi
  viola/g scuro come obsidian"). `color-scheme: dark`: the system's light setting is not followed.
- **Accents from Material's violet palette** (primary), cyan for the tertiary. The accent roles are
  global variables too (2026-11-12, "Accents"), with the palette's own values.
- **Surfaces are neutral greys**, not the palette's violet-tinted ones: the page anthracite (`#1f1f22`),
  the chart cards almost black (`surface-container-lowest`), windows and menus lighter.
- **Colours come from the theme's variables** (`--mat-sys-*`, `--lenzi-*`), never written by hand in a
  component.
- **Status colours are the only colours with a meaning**: `--lenzi-status-good` (green) and
  `--lenzi-status-bad` (red), a pair for the dark theme (lenzi, 2026-10-09). Nothing else is green or red
  because of what it says.

## Typography

- **One font for the interface: Roboto** (lenzi, 2026-11-25: "il font proviamo roboto perfavore. così da non andare in
  contro ad apple"; Roboto Mono for everything from 2026-10-02), bundled with the app (`styles/fonts.css`). Code in
  Roboto Mono, bundled too. Never Apple's SF: its licence lets it be used only for Apple's platforms.
- **Bold (700)** for display, headline, title and label styles: titles, buttons, chips, tabs, toggles,
  menus, the drawer's entries, the names of figures and of table rows. **Values regular.**
- Material's sizes, untouched.

## Figures

- **A figure is its name on top, bold, and its value under it** (lenzi, 2026-10-02: "Voglio cos'è sopra
  e il valore sotto"). `LenziFigure`.
- **Never two pieces of data on one line joined by "·"** in a card, a list or a tree: one line, one
  fact.
- **The server computes, the page shows.** A number that means something comes from the API, already
  computed; the page formats it (currency, decimals, dates) and never does money arithmetic with
  JavaScript numbers. A value the API does not give means extending the API.
- Numbers line up: `font-variant-numeric: tabular-nums`.

## Glass

- **Windows, menus and bars are see-through** (lenzi, 2026-10-01: "un po' di trasparenza nelle
  finestre", like Android 17's app menu and notification shade): they keep `--lenzi-glass` (56%) of their
  colour, the top bar `--lenzi-glass-bar` (66%), and blur what is under them (24 px, saturation 160%).
- **Glass**: dialogs, page windows, the drawer, menus, selects, autocomplete, date and time pickers,
  snackbars, tooltips, the top bar. **Solid**: cards, tables and panels of a page (nothing is under
  them), and the info bars (they must stand out).
- **The scrims blur the page** behind a dialog, a page window or the drawer (6 px).
- **Liquid Glass is another material** (lenzi, 2026-11-19: "quasi come il liquid glass di IOS ... diverso dal classico
  vetro"; "il bordo voglio che rimanga nascosto fino all'ultimo"): `lenziLiquidGlass`, clear, it bends what is behind it
  near its curved edge, and has no border, only a rim of light on its very edge. Chromium only bends.
- **An app may be Liquid Glass** (lenzi, 2026-11-25: "usa le regole di Apple per capire dove applicarlo e come in modo
  ottimale"; Apple's Human Interface Guidelines, Materials and Color): `provideLenziLiquidGlass()`.
  - **Every surface, the panels too** (lenzi, 2026-11-26: "Non c'è ancora nulla che sia stato convertito in liquid
    glass, come i pannelli o altro, stiamo rifacendo l'interfaccia del kit praticamente"; before, Apple's "Don't use
    Liquid Glass in the content layer" kept them solid): what floats (the top bar, the drawer, windows, menus and select
    panels, the "+", a bar of actions `.lenzi-floating`), the pane behind a page, cards, the app's panels
    (`.lenzi-surface`) and every lit surface (`lenziLit` gives itself to the app's glass). **Clear, never frosted**
    (lenzi, 2026-11-26: "i pannelli di vetro devono tutti essere convertiti in liquid glass, adesso sono solo glass
    blurrati"): what is behind shows sharp and bends at the edge; those with words on them have a darker tint to read
    on. Lamps (`lenziGlow`) stay lights; a demo of lit glass says `litOnly`. `pages: false`: only what floats.
  - **A page of tiles has no pane** (`lenziGlassPage [pane]="false"` with a `LenziBento`): the tiles are the glass,
    never glass on glass.
  - **Its edge is lit by what is under it** (lenzi, 2026-11-26: "i bordi ancora non sono dinamici alle luci, sono tutti
    scattanti e la direzione della luce deve cambiare rispetto a quello che sta sotto, no il mouse o roba che ti
    inventi"): bright where a light is under it, on that side, dark over the dark page (a faint line only, so the shape
    reads), following it at every frame, smoothly. Never a light of its own: no pointer, no fixed angle, no boids.
  - **The default optics** (lenzi, 2026-11-25: "per il vetro tieni i valori dafault di apple per ora"; kube.io's: refraction
    1, blur 0.2, specular opacity 0.5, specular saturation 6): **its edge takes the colour of what is under it** (a
    saturated copy of it, kube.io's way: "guarda come i bordi prendono il colore di quello che sta sotto"), with a light
    tint to read on (`--lenzi-liquid-tint` 30%; larger glass more opaque, `--lenzi-liquid-tint-large` 50%).
  - **Controls of glass, Apple's** (`@lenzi/ui-kit/backgrounds`): `LenziGlassSwitch`, `LenziGlassSegmented`,
    `LenziGlassSlider`, `LenziGlassSearch`: a thumb of milky glass at rest that becomes clear glass while held, larger,
    and settles milky again; thicker glass than kube.io's, bending more, convex (a lip drew a box inside the thumb),
    its edge's line lit all round (`lightBase` 0.45), so it shows on something this small
    (lenzi, 2026-11-26: "configura gli elementi più piccoli per fare in modo che l'effetto liquidglass si veda meglio, come lo slider, toggle ecc.").
  - **No colour of its own**: it takes the colours behind it; **only the primary action is coloured glass** (the "+").
  - **Its edges, Apple's way** (lenzi, 2026-11-25: "Fai la stessa cosa anche per i bordi, guarda cosa dice apple e
    replica"): no stroke; corners concentric to what they hold (controls are capsules, a panel's radius is its
    content's plus the gap); a scroll edge effect under the bar instead of a fill; no glass over a window's glass
    (a menu opened on a window stays frosted).
  - **The page's title is in the page** (lenzi, 2026-11-25: "togli la barra sopra che non ha senso, metti un titolo
    normale un po' grande"; "il titolo è troppo vicino al lato"): with the bar of pages there is no top bar; the title
    is large and bold at the top of the page's column (`lenziGlassPage`), one per page (a page's own h1 wins).
- **Reduce transparency** (`LenziAppearance`, and the system's own `prefers-reduced-transparency`) makes
  every surface solid again.

## Motion

- **Windows never grow** (lenzi, 2026-10-02: a spring that looked like lag, "sembra che lagga"): full
  size from their first frame; their content fades in (250 ms), they fade out closing (150 ms).
- **Every window rises into place**: 24 px in 300 ms, Material 3's emphasized decelerate (lenzi,
  2026-10-02: "aggiungi animazione apertura"). Every other panel that appears over the page rises the
  same way, 8 px; the snackbar 24 px (lenzi: "La voglio su ogni pannello che appare in quel modo").
- **The blur is whole from the first frame** (lenzi, 2026-10-02: "metti il blur all'apertura di ogni
  pagina che sotto mostra il resto"): the glass never fades in, what it holds does.
- **A window waits for its content** (hidden, at most 400 ms) so it appears at its size: mark what it
  waits for with `lenzi-not-ready`.
- **None of it with reduced motion.**

## Borders and shape

- **Every border is 1 px** (`--lenzi-border`), Material's and ours (lenzi, 2026-11-25: "in generale dovrebbero essere
  dappertutto il 50% di quello che sono ora, tante outline sono troppo spesse"; before, 2 px, from 2026-10-02: "i
  bordi agli angoli non hanno lo stesso spessore dei lati", a 1 px border being fainter along a corner at 100%
  scale). A focused field, and a focus ring, 2 px (`--lenzi-border-focus`). A chosen swatch's ring 1 px too.
- **Every corner takes one shape** (`--lenzi-corner-shape`, round or squircle; lenzi, 2026-11-14: "a toggle
  for squircle/normal rounded squares ... a global variable and should act everywhere"): Material's and
  ours, from the global styles. Never set `corner-shape` in a piece, except to keep a circle a circle: next
  to a `border-radius: 50%` write `corner-shape: round`, or give the element the class `lenzi-round`.
- **Every surface that rises above the page has a border** in `outline-variant`: cards, panels,
  dialogs, page windows, the drawer, tables.
- **The top bar and the drawer float** 8 px from the screen's edges, rounded 16 px on every side
  (lenzi, 2026-10-02: "la barra in cima deve avere bordi arrotondati in entrambe le versioni"). **Scrolled
  past its height it closes from the right onto its menu button**, the edge covering the title (lenzi,
  2026-11-14: "the top bar should slide in from right to left and close on the icon"). A page's search bar stays in
  the page: it no longer rides into the closed bar (lenzi, 2026-11-25: "Da rimuovere l'animazione che abbiamo fatto
  per la barra di ricerca perchè non mi piace tanto"; `lenziShellSearch` is gone).
- **Menus, selects and autocomplete panels are rounded on every side** (12 px), a few px away from
  their field; **the chosen option is a pill** inside them (lenzi, 2026-10-02).

## App shell and navigation

- **A drawer on every screen**, opened from the menu button in the top bar, closed after a tap on a
  link (lenzi, 2026-10-02: "la barra di fianco si apra con un tasto come la versione android"). 240 px
  wide. `LenziAppShell` + `LenziNavList`.
- **The drawer holds links only, no data**: the app's name at the top, one link per page with its icon,
  the current one highlighted (also on its child routes), the rest at the bottom (settings, sign out).
- **Or a bar of pages at the bottom** (lenzi, 2026-11-25: "una barra orizzontale (magari da usare su mobile invece che
  su web, ma in realtà anche su web deve funzionare e può essere un'alternativa)"): `LenziGlassTabBar` in
  `lenziShellTabs`, `navigation="bar"` (at the bottom on a phone, **upright on the left on a computer**, in place of the
  drawer: lenzi, 2026-11-25, "mettimela anche su pc al posto di quella che abbiamo adesso ma in verticale a sinistra")
  or `"auto"` (the bar at the bottom on a phone, the drawer wider). Apple's tab bar: it
  floats over the page, its tabs are pages only (no actions), a word each, five at most, never hidden or disabled; the
  current one on a capsule that slides there as glass; the rest (Admin, Sign out) in a capsule of its own at the end.
  With the bar the top bar has no menu button and stays whole; the page and the "+" keep clear of it.
- **Controls of the kit's own, not Google's** (lenzi, 2026-11-25: "riadatta il kit per usare questi elementi al posto
  di quelli default di google"): a switch is `LenziGlassSwitch`, a slider `LenziGlassSlider`, choices side by side
  `LenziGlassSegmented` (32 px with its track, as every toggle), in the catalog and in a new page; Material's slide
  toggle, slider and button toggle group are not used for them any more. Apple (HIG, Toggles): a switch for a setting
  in a list row; elsewhere a button that toggles.
- **The top bar shows the current route's title** and sticks while the page scrolls under its glass.
- **The document scrolls, not the shell.**
- **Unknown addresses** get the not-found page (`LenziNotFound`) with one way out.
- **The version** sits in the bottom right corner of every page, small and faint (lenzi, 2026-10-03).

## Actions and words

- **Whole words on buttons, never abbreviations** (lenzi, 2026-09-30: "avg lo uso io con te al massimo,
  ma in UI mai come nome di un tasto"): "last | average", not "avg". An app may name one exception and
  write it in its own design.
- **The language of the interface is the app's** (substance-tracker and vtiger-reader: English); code,
  names, comments always English.
- **The floating "+"** (`LenziAddButton`) is the page's one way of adding: bottom right, 64 px (a little
  larger than Material's 56, lenzi 2026-09-29). It says it was pressed; the page decides what opens.
- **Toggles are pills, 32 px high** (lenzi, 2026-09-30: 48 px was "ciccio in altezza"), each label with
  14 px at its sides. **Less tall never means less round.** Two or more choices side by side: a toggle
  group; one pill that switches what a figure shows: `LenziPillToggle`.
- **Search bars are elongated circles** like a browser's (lenzi, 2026-09-30: "come la barra di Chrome …
  non quadrato con i bordi smussati"), 48 px high, a magnifier and what they look for inside them; they
  search as you type (300 ms pause), a ✕ clears them, the text lives in the page's URL. **Only search
  bars** have this shape. `LenziSearchBar`.
- **A colour is changed from the colour itself** (lenzi, 2026-11-12: "se mostri un colore o che, fammi
  cliccare sul colore e mostrare un selector di colore"): wherever a colour the user may change is shown,
  it is a round swatch that opens the colour selector at a click, a glass panel like a menu's (the shade,
  the hue, the hex, the colours the app offers). `LenziColorPicker`; never the browser's own colour input.
  **A changed colour always has a way back** (lenzi, 2026-11-12: "Need a way to go back and put a snackbar
  asking sum like "U sure?""): a button in the selector, and a snackbar that asks to keep the new colour
  when the selector closes, with "Go back".
- **No tap highlight** (lenzi, 2026-10-10): Material's own state layers are the feedback.

## Cards

- **A card opens its page or its details on a tap.** It is not a button or a link when it holds
  something interactive (a toggle, a menu): their taps never reach the card.
- **Its actions are in a ⋮ menu at its top right** (`LenziCardMenu`): Edit, Delete, Details.
- **A card that previews what it opens is YouTube's video card** (`LenziPreviewCard`; lenzi, 2026-11-14: "usa
  questa di youtube come base, paddin ai lati leggermente meno"): the preview on top, rounded; under it the title,
  bold, its facts one a line, the ⋮ beside the title; a tinted surface behind it only while it is pointed at. **A
  preview that moves starts only then** ("fai partire solo la simulazione di quella on hover").
- **The same thing is the same colour everywhere**: its identity colour (below), shown as a dot next to
  its name.

## Dialogs and forms

- **One form component per entity**, used everywhere that entity is created or edited; it decides its
  mode (new or edit) from its input.
- **The back button closes a dialog** (it has its own history entry): open dialogs with `LenziDialogs`.
- **Every save button is disabled on tap** (no double submit); the dialog closes on the server's
  success; on a 400 it stays open with each error under its field, in the API's words; errors of no
  field above the buttons.
- **Destructive actions ask first** (`LenziConfirmDialog`), and their button is in the error colour.
- **A lighter window** (details): `panelClass: 'lenzi-dialog-raised'`.

## Lists and empty states

- **What a list says instead of its content** (`LenziStatusMessage`): "…" while it loads, a short
  sentence when there is nothing, and why it failed ("Could not load the substances: Not found (404)").
  A failure is never a blank page.
- **A list keeps what it shows while the next page loads** (`keptValue`): nothing shrinks or blinks.
- **More items**: "Show more", never a jump.

## Tables

- **Names fixed at the left, bold, with their identity dot; numbers at the right in columns.**
- **A table scrolls sideways inside its own box**, never the page (`LenziDataTable`).
- A tap on a header orders by it; a tap on a row opens it.

## Identity colours

- **An entity's colour is computed from its id**, never stored, and never a status colour
  (`identityColor`). All violet: a band from blue-violet to magenta (lenzi, 2026-10-02: "terrei tutto
  viola anche per le sostanze e i batch").
- **The algorithm is frozen**: changing it repaints every entity of every app.

## Charts

- **Only through `LenziChart`** (Apache ECharts, the modular import, SVG).
- **Bars with rounded ends**; in a stack only the outer pieces are rounded. **Soft lines** (2.5 px) that
  never dip under zero. **No axis lines or ticks**, a faint horizontal grid.
- **The period in progress** is striped, its label in the theme's violet, a line's last stretch dashed
  (lenzi, 2026-10-02: "Si tratteggio").
- **Each line in its identity colour**; chips above the chart hide lines by hand.
- **The chart's card** (`LenziWidgetCard`): almost black, 24 px corners, an icon in a round well, a large
  title, its own interval toggle (lenzi, 2026-10-01: "ogni card suo toggle").
- **Tooltips in dark glass**, like every tooltip.

## Phones

- **A phone is a window under 600 px wide** (`@media (max-width: 599px)`), in the styles and in code (`lenziPhone()`,
  `LENZI_PHONE_QUERY`; lenzi, 2026-11-20): one line, never a width of an app's own.
- **Comfortable at 390 px wide**, no horizontal scroll of the page anywhere.
- **On a phone a panel's header keeps only its title** (lenzi, 2026-10-03: "su mobile non mostrino le
  informazioni dei toggle"); the rest is inside it.
- **Edge to edge** (an Android app): what must stay readable keeps away from the system bars by the
  safe-area insets; the kit's shell already does.

## Backgrounds

- **Three kinds** (lenzi, 2026-11-13: "normal (color, photo, ecc) and the glowing ones (for now blob and
  flock)"): `LenziBackground` (a colour, a gradient, a photo; only CSS), `LenziBlobBackground` and
  `LenziFlockBackground` (WebGL2, no library). **One background per page**, behind it or behind one box.
- **The glowing objects take the accent**, each moved a little from it (lenzi: "some displacement variable
  ... the displacement shouldn't be too much by default"): the hue by ±12° by default (`spread` 0.2).
- **On a solid colour, dark or light** (lenzi: "a solid color (dark or light depending on the theme)"): on a
  dark one the glow is added light; on a light one a haze of colour. The kit stays dark only: the light base
  is ready for a light theme, not a light theme.
- **Every background has a blur** over the finished picture (lenzi: "so that you can also use the
  blobs/flocks for other artistic purposes").
- **Readable first**: a blob is a deep shade of the accent at the default brightness; text over a background
  keeps its contrast.
- **Surfaces over a background are lit only where the app asks** (`lenziLit`; lenzi: "like the youtube
  backlight feature where elements get slightly alominated by it"): glass that shows the background through
  it, with its light as a veil and along the border. Without it, cards stay solid. Reduce transparency makes
  them solid and unlit.
- **A page over a background has a glass pane behind its elements** (lenzi, 2026-11-17: "whenever we have a
  background like this, we need a glass panel behind like in overview and components"): lit glass with a panel's
  border, away from the screen's edges; on a phone the whole screen. Without a background, no pane. It is
  `<main lenziGlassPage>`; the kit knows by itself whether a background is behind the page (lenzi, 2026-11-19).
- **Over a background, every card and element of the page is lit; without one, solid** (lenzi, 2026-11-17:
  "wherever page we have a background cards or any elements over the background should turn into lit elements,
  also the menu on the right should also a lit element. not an emitter"): the page's own surfaces (cards, panels,
  a card's ⋮), `[lenziLit]="lit()"` with `lit = lenziOverBackground()`; what is inside them (code, an editor, a demo) stays as it is. Lit is
  not glowing: a lit element takes light, a glowing one (`lenziGlow`) sheds it.
- **Decoration**: hidden from screen readers, never in the way of a click; stopped out of view and with
  reduced motion; a still picture where there is no WebGL2.
- **Blobs are made of the page's materials** (lenzi, 2026-11-14: "Fai in modo che i blob possano anche essere
  di vetro o solidi e interagire allo stesso modo delle componenti che abbiamo fatto oggi"): a lamp glows and
  lights; glass blurs what is behind it and takes the light around it, as `lenziLit` (the same glass %, veil,
  rim); solid is the page's surface, lit on its edge on the side of the light, and casts a hard shadow on
  the glow, as `lenziSolid` (the same `--lenzi-shadow`). **Blobs melt only into blobs of their own material.**
- **A background of blobs and fleets is a scene** (lenzi, 2026-11-14: "una Scena ... é tipo la scena che usiamo
  nel background della home"): data (`LenziScene`: blobs, fleets, the pointer), drawn by `<lenzi-scene>`. An app
  keeps its scenes as data, and a phone gets a lighter scene of its own (`[phoneScene]`: the scene changes it
  with the window, the app writes no code for it; lenzi, 2026-11-20).
- **What stops what is on one layer** (lenzi, 2026-11-14: "they're obstacles only to objects that are on the
  same z-level"): the lamps, the solid things and the boids share one; glass is above it, and the boids fly
  under the glass.
- **Flocks keep to their own** (lenzi, 2026-11-14): boids flock only with boids, and fly round every blob;
  blob-boids (boids that are blobs of a material) flock only with their fleet, melt only into their own
  material, and fly round the rest. **Small boids are a little slower and follow from a little farther**, so
  the large ones, the leaders, fly ahead.

## Light

- **A glowing element is a lamp on the page's plane** (lenzi, 2026-11-14: "a lit surface and projects light
  directly onto the others component ... this elements must act on the same plain as the other elements
  unlike the backhgorund"): `lenziGlow` on any element (a button, a list, a card, a chip). It glows in its
  colour and lights the lit surfaces (`lenziLit`) near it, centred on itself (lenzi, 2026-11-14: "they're
  generally uncentered"): the light fades with the distance from its outline.
- **Any colour, and lights add up** (lenzi: "ovviamente la luce di tutti i colori").
- **Lamps are few**: they say that something is alive. **Only lit surfaces take light**; the rest stays solid.
- **Solid elements cast a faint hard shadow** (lenzi, 2026-11-14: "a faint hard shadow ... for if a solid
  component is interacting with light"): `lenziSolid`. Glass lets the light through. A shadow falls only on
  what lies under the element ("The one on the bottom shouldn't be able to cast to the one on top").
- **A blob background's blobs are lights** for the glass over them (lenzi, 2026-11-14), gently: the words on
  the glass stay readable. **And the light behind a lit surface lies on it too** (lenzi, 2026-11-17: "the buttons on
  top i think arent litElements or they aren't receiveing light properly": a card far from every blob was darker
  than the glass under it): all of it along its border, `--lenzi-lit-picture-veil` of it over its words.
- **The light lies over what an element holds**, never under its children only (lenzi, 2026-11-14: the
  selector "shouldn't ignore the light at all").
- **How much light lies on a surface, and how dark a shadow is, is global** (`--lenzi-glow-veil`,
  `--lenzi-glow-rim`, `--lenzi-shadow`); a lamp has its own colour, strength and reach.

## 3D

- **Only through `LenziThreeCanvas`**, in the theme's colours, on a lazy route.

## Code

- **Every Angular artifact is made with `ng generate`**, never written by hand (lenzi, 2026-09-29).
  Files no schematic makes (a data module, a config) are written by hand and said so in their first
  comment.
- **Standalone components, signals** (`input()`, `output()`, `model()`, `computed()`), the new control
  flow.
- **Gateways are the only code that calls `HttpClient`**; failures arrive as `ApiError`
  (`lenziErrorInterceptor`).
- **Every page is a lazy route.**
- **Code in English**: names, comments, messages.

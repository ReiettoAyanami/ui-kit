# Liquid Glass

`lenziLiquidGlass` (`@lenzi/ui-kit/backgrounds`; lenzi, 2026-11-19: "deve essere quasi come il liquid glass di IOS,
prova a fare un materiale che si chiama appunto LenziLiquidGlass diverso dal classico vetro"; "il bordo voglio che
rimanga nascosto fino all'ultimo"). The way: kube.io, "Liquid Glass in the Browser: Refraction with CSS and SVG"
(Chris Feijoo), chosen by lenzi; the reference for this material: https://kube.io/blog/liquid-glass-css-svg/

## What

- **Clear glass that bends light**, not the kit's frosted glass (`lenziLit`): a slab with a curved bezel round its
  edge. What is behind it is bent near the edge, the middle flat and clear, as Apple's Liquid Glass does ("lensing").
- **How it bends** (`liquidGlassMaps`): the bezel's height is a profile of the distance from the edge (`surface`:
  `squircle`, Apple's convex default; `circle`; `lip`, convex then concave), `thickness` px tall, `bezel` px wide. A
  ray from behind meets the bezel's slope and bends by Snell's law (air 1, glass `ior` 1.5); crossing the glass it
  moves sideways. That shift, at each distance from the edge, along the edge's normal (round corners too), is drawn
  into a displacement map (red and green, 128 none; blue the line on the edge, below) and given to `feDisplacementMap`,
  its scale the largest shift. One picture a glass: every picture of the filter is drawn again at every frame (three
  maps under six cards took the home from 200 frames a second to 51; one, in nine shared pieces, to 188; 2026-11-26).
- **Antialiased** (lenzi, 2026-11-25: "attiva antialiasing"): a pixel the outline crosses is four points of the maps
  averaged, so the rim and the bending fade across the round corners instead of stepping with the pixels.
- **A little blur and saturation** of what is behind (`blur` 1.5 px, `saturation` 1.5).
- **No border; its edge is lit by the light under it** (lenzi, 2026-11-26: "i bordi ancora non sono dinamici alle luci,
  sono tutti scattanti e la direzione della luce deve cambiare rispetto a quello che sta sotto, no il mouse o roba che
  ti inventi"; before, a rim lit by the pointer and the boids, one of eight sides at a time): kube.io's line on the very
  edge (about 1.5 px, the same all round), as bright as what is under each point of it is (what is behind, gathered
  `lightReach` px round it; nothing below the page's dark colour but a faint line, `LIGHT_BASE`, so the shape reads;
  whole a little past half), in its colour (the saturated copy) with a highlight in the light's own colour over it
  (`specularOpacity`). All in the filter: at every frame the page draws, the edge lights on the side a light is under
  it and follows it smoothly. No fixed side, no pointer, no script.
- **One filter per glass, made for its size**, again when it changes size or a setting (the maps are as large as it
  is), or its corners (`border-radius`, from any CSS: looked at about twice a second; lenzi, 2026-11-21, "tanti input non
  si aggiornano automaticamente").
- **Any shape** (lenzi, 2026-11-19: Liquid Glass on the cat): `glassPath`, an SVG path stretched over the element as
  `glassViewBox` says, and the bezel follows its outline: the path is drawn into pixels and each pixel's distance from
  the outline found (an exact distance transform, softened a little). The element still takes the shape's mask
  (`mask-image`) to show only inside it. Without a path: the element's box and its corners' radius.

## Rules

- **Chromium only bends** (an SVG filter as `backdrop-filter` is not drawn by Safari or Firefox): there the glass is
  blur and saturation only, still clear and borderless.
- **Few of them**: each has its own maps (as many pixels as it has); resizing it all the time costs.
- **Over a background**: clear glass needs something behind it to bend (a scene, a picture). On a plain page it is
  only its rim.
- It is a material like `lenziLit` and `lenziSolid`: never two of them on one element.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `bezel` | px | `28` |
| input | `thickness` | px | `56` |
| input | `ior` | refractive index | `1.5` |
| input | `refraction` | how much of the bending, 0 to 1 and beyond | `1` |
| input | `surface` | `'squircle' \| 'circle' \| 'lip'` | `'squircle'` |
| input | `blur` | px | `0.2` |
| input | `saturation` | 1: as it is | `1` |
| input | `specularOpacity` | 0 to 1: how bright the edge gets over a full light | `0.5` |
| input | `specularSaturation` | the edge's copy of what is behind, saturated | `6` |
| input | `lightReach` | px: how far round the edge the light under it is gathered (frosted glass: as far as it is frosted) | `12` |
| input | `lightBase` | 0 to 1: the edge's light with nothing bright under it, the same all round (the kit's controls: 0.45, so a thumb over a dark panel shows as glass) | `0.1` |
| input | `chromaticAberration` | 0 to 1: colour fringes where it bends, red bent more and blue less (ybouane's; lenzi, 2026-11-26: "se possiamo anche noi avere gli stessi slider"); 0 costs nothing | `0` |
| input | `brightness` | -0.5 to 0.5: brighter or darker than what is behind (ybouane's) | `0` |
| input | `distortion` | 0 to 1: a fine ripple all over it, rough glass (ybouane's) | `0` |
| input | `glassPath` | an SVG path (even-odd): the glass's own shape | `null` (its box) |
| input | `glassViewBox` | the path's view box | `'0 0 100 100'` |
| function | `liquidGlassMaps(shape)` | the displacement and rim maps, and the scale | |
| function | `liquidGlassOutlineMaps(outline)` | the same for any shape, from what it covers (one alpha a pixel) | |
| function | `provideLenziLiquidGlass({ selectors?, settings? })` | the whole app of Liquid Glass | |
| class | `LenziLiquidSurface(element, document, settings)` | one glass: `build()`, `check()` (its corners, now and then), `destroy()` | |

## Example

```html
<lenzi-scene [scene]="scene" />
<section class="window" lenziLiquidGlass>…</section>
```

```css
.window { border-radius: 28px; padding: 24px 32px; }
```

## An app of Liquid Glass

`provideLenziLiquidGlass(options?)`, Apple's way (lenzi, 2026-11-25: "usa le regole di Apple per capire dove applicarlo e
come in modo ottimale"; the Human Interface Guidelines, Materials and Color, read on 2026-11-25):

- **Every surface** (lenzi, 2026-11-26: "Non c'è ancora nulla che sia stato convertito in liquid glass, come i pannelli
  o altro, stiamo rifacendo l'interfaccia del kit praticamente"; Apple keeps the content layer solid, lenzi does not):
  what floats (`LENZI_LIQUID_SURFACES`: the top bar and the drawer, dialogs, menus, the panels of selects and
  autocompletes, the "+", `.lenzi-floating`, the pane of `lenziGlassPage`) and the page's own surfaces
  (`LENZI_LIQUID_PAGE_SURFACES`: cards, `.lenzi-surface`), and every lit surface: `lenziLit` gives itself to the app's
  glass (`adopt`) instead of taking the background's light. `{ pages: false }`: only what floats.
- **Not glass**: a lamp (`lenziGlow`: a light), a surface kept lit glass (`lenziLit litOnly`: a demo of that material),
  a menu opened over a window (frosted).
- **Clear, never frosted** (lenzi, 2026-11-26: "i pannelli di vetro devono tutti essere convertiti in liquid glass,
  adesso sono solo glass blurrati"): what is behind shows sharp through every glass and bends at its edge. Words are
  read on a darker tint: the pane, cards and panels, windows, menus and the drawer take `--lenzi-liquid-tint-large`; the
  bar, the "+" and the controls `--lenzi-liquid-tint`. The tint is drawn by the filter (`--lenzi-liquid-fill`, its own,
  never inherited) under the edge's light. `--lenzi-liquid-frost` (px) frosts a glass that asks; none does.
- **The kit's glass**: a squircle bezel 24 px wide, 48 thick (at most a third of the glass's smaller side: 18 on the
  56 px bar): wide enough that the bending shows on a large panel.
- **The default optics, the edge in the colours under it** (lenzi, 2026-11-25: "guarda come i bordi prendono il colore
  di quello che sta sotto"; "per il vetro tieni i valori dafault di apple per ora"): kube.io's filter chain: what is
  behind blurred a little (0.2) and bent (refraction 1); on the edge, where the specular map says, a much more saturated
  copy of it (`specularSaturation` 6) and over it a highlight (`specularOpacity` 0.5), both as strong as the light under
  each point of the edge (2026-11-26, above). The line is kube.io's, measured from its maps: about 1.5 px wide on the
  very edge (kube.io lit it from a fixed angle, -60°: no more); a light tint of the page's
  colour to read on (`--lenzi-liquid-tint`, 30%). **Larger glass more opaque** ("more opaque in larger elements like
  sidebars"): the drawer, the windows and a page's pane, `--lenzi-liquid-tint-large` (50%). Apple's clear variant is for what floats over photos and videos,
  with a 35% dark layer: not used by the kit's surfaces.
- **No colour of its own**; the primary action alone is coloured glass ("For primary actions, color the background"):
  the "+" keeps its accent.
- **Its edge lives with the light under it** (above), never with the pointer; pressed, the "+" gives a little ("reacts
  to touch and pointer interactions in real time").
- **Its edges, Apple's way** (lenzi, 2026-11-25: "Fai la stessa cosa anche per i bordi, guarda cosa dice apple e
  replica"; Adopting Liquid Glass, Applying Liquid Glass to custom views, HIG Layout):
  - **no stroke**: a glass has no border, its rim is light;
  - **concentric corners** ("rounded shapes that are concentric to their containers"): a control is a capsule ("within a
    Capsule shape"): the top bar, a bar of actions, the "+" (a circle); a larger panel's radius is its content's plus
    the gap: menus 8 + 6 px, the drawer 28 + 12, windows 20 + 16;
  - **a scroll edge effect** instead of a fill under the bar ("use a scroll edge effect to visually elevate controls
    above content"): what scrolls under the bar is blurred and fades at its edge;
  - **never glass on glass** ("avoid overcrowding or layering Liquid Glass elements on top of each other"): a menu or a
    select opened over a window stays frosted.
- A kit or Material surface keeps its border's width, not its colour; a bezel is never wider than a third of the
  surface's smaller side. Snackbars and tooltips stay frosted glass. **Reduce transparency** turns it all off.
- `LenziLiquidSurface` is one glass, the engine the directive uses too.

## The blobs' liquid glass

The glass blobs of a background (`glass="liquid"`, `[liquid]`) and of a scene (`glass: 'liquid'`, `liquid`) take the
same optics, drawn by WebGL instead of an SVG filter: `bezel`, `thickness`, `ior`, `refraction`, `surface`,
`saturation` (`LenziLiquidBlobGlass`, `LIQUID_GLASS`; no rim of their own: their edge takes the scene's light). Their
blur is each glass's own (`blur` of a blob or a fleet, with its `tint` and `transparency`; 2026-11-21). See the blob
background's README.

## Origin

New in the kit (2026-11-19), for lenzi-dev. Its page in the catalog, every setting a parameter over a scene, blobs, a
flock or a picture (2026-11-20: "nella pagina del liquid glass nei components per regolare le varie proprietá dello
stesso").

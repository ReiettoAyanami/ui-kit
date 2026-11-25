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
  into a displacement map (red and green, 128 none) and given to `feDisplacementMap`, its scale the largest shift.
- **Antialiased** (lenzi, 2026-11-25: "attiva antialiasing"): a pixel the outline crosses is four points of the maps
  averaged, so the rim and the bending fade across the round corners instead of stepping with the pixels.
- **A little blur and saturation** of what is behind (`blur` 1.5 px, `saturation` 1.5).
- **No border**: only a rim of light on the very edge (a few px), and only when the boids of a flock behind come near
  (lenzi, 2026-11-19: "quelli devono esserci solo quando i boidi ci si avvicinano"): dark while none is near,
  brighter the more there are (whole at `rimBoids`, 60; `rim` 0.5 at most), lit on the side they come from (eight
  sides), all round once they are under the glass (`LenziSights.around`, at every frame; the nine rims drawn once).
- **The pointer lights it too** (lenzi, 2026-11-25: "Controlla che i bordi dinamici lo siano veramente": with no flock
  the rims never moved): within `pointerReach` px (160) of the glass, brighter nearer, on the side it comes from; the
  brighter of the two lights wins.
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
| input | `blur` | px | `1.5` |
| input | `saturation` | 1: as it is | `1.5` |
| input | `rim` | 0 to 1 | `0.5` |
| input | `lightAngle` | degrees | `-60` |
| input | `glassPath` | an SVG path (even-odd): the glass's own shape | `null` (its box) |
| input | `glassViewBox` | the path's view box | `'0 0 100 100'` |
| function | `liquidGlassMaps(shape)` | the displacement and rim maps, and the scale | |
| function | `liquidGlassOutlineMaps(outline)` | the same for any shape, from what it covers (one alpha a pixel) | |
| function | `provideLenziLiquidGlass({ selectors?, settings? })` | the whole app of Liquid Glass | |
| class | `LenziLiquidSurface(element, document, sights, settings)` | one glass: `build()`, `light()`, `destroy()` | |

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

- **The floating layer of navigation and controls only** ("a distinct functional layer for controls and navigation
  elements"): the top bar and the drawer (`LenziAppShell`), dialogs, menus, the panels of selects and autocompletes, the
  floating "+" (`LenziAddButton`), and what the app marks `.lenzi-floating` (a bar of actions). `LENZI_LIQUID_SURFACES`.
- **Never the content** ("Don't use Liquid Glass in the content layer"): cards, tables, grids, a page's panels stay solid
  (`{ pages: true }` would make them glass too: only for a page that is itself a picture).
- **Sparingly** ("Use Liquid Glass effects sparingly"): what it bends is the content scrolling under it.
- **The regular variant**: it "blurs and adjusts the luminosity of background content to maintain legibility": a tint
  of the page's colour (`--lenzi-liquid-tint`, 60%) and 5 px of blur (`LIQUID_EVERYWHERE_SETTINGS`; lenzi: "più scura e
  leggermente più blurrata"). **Larger glass more opaque** ("more opaque in larger elements like sidebars"): the drawer
  and the windows, `--lenzi-liquid-tint-large` (75%). Apple's clear variant is for what floats over photos and videos,
  with a 35% dark layer: not used by the kit's surfaces.
- **No colour of its own**; the primary action alone is coloured glass ("For primary actions, color the background"):
  the "+" keeps its accent.
- **Its rim lives**: near the pointer and the boids (above); **pressed**, the whole rim lights up, brighter, and the "+"
  gives a little ("reacts to touch and pointer interactions in real time").
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

# Blob background

`<lenzi-blob-background>` (`@lenzi/ui-kit/backgrounds`): glowing soft shapes behind the page (lenzi,
2026-11-13: "supershapes like the ones that materialui uses, and i want them to be able to merge together").
Shapes like Material 3 Expressive's (circle, squircle, rounded polygons, clovers, cookies, suns) drift, turn,
change from one into another and melt into each other where they meet, glowing on a solid colour.

## What it does

- **WebGL2, no library**: one shader draws every blob as a distance from its shape's edge; the edges join
  softly (`merge`), and the colours blend where they join.
- **Colours from the accent** (`--mat-sys-primary` by default), each blob moved a little in OKLCH (`spread`,
  0.2 by default: the hue by ±12°), always the same for the same `seed`.
- **A glow around them**, not over them: a blob stays its colour, the glow spreads around it (`glow`,
  `halo`). On a light `base` the glow is a haze of colour instead of added light.
- **`blur`** over the finished picture, for an artistic background.
- **Stops** out of view and in a hidden tab; **one still picture** with reduced motion or `animate` false;
  **a still CSS picture** where there is no WebGL2.
- **Every blob is a light** for the page's `lenziLit` surfaces (`lights`, on by default; lenzi, 2026-11-14):
  a surface near a blob takes its light from the side that faces it, in its colour, gently; solid elements
  (`lenziSolid`) cast shadows from it.
- **Decoration**: hidden from screen readers, never takes a click; the pointer is read from the window.
- **Materials** (`materials`; lenzi, 2026-11-14: blobs "di vetro o solidi"): a lamp (glows, lights the page's
  lit surfaces), glass (blurs what is behind it, takes the light around it, as the page's glass), solid (the
  page's surface, its edge lit on the side of the light, a hard shadow on the glow behind it, following its
  shape). Blobs melt only into blobs of their own material. A solid blob's shadow falls on its own level and the ones
  under it, never on one above it (lenzi, 2026-11-20: glass over a solid blob was half in its shadow, cut along the
  solid's hidden edge; RULES.md, Light: "The one on the bottom shouldn't be able to cast to the one on top").
- **Liquid glass** (`glass="liquid"`; lenzi, 2026-11-19: "capire se questa tecnica per il rendering del vetro si
  può usare su forme che non sono regolari e stabili come le supershapes ... un'altra scelta nel kit"): the glass blobs
  are clear and bend what is behind them near their edge, as `lenziLiquidGlass` does (kube.io's way: a curved bezel,
  Snell's law), instead of frosting it; no border, only the light on their edge. It follows their shape at every frame,
  as they turn, change shape and melt into one another: the blobs' field gives the distance from the edge and its
  normal at every place, and the bezel's bending is read there. It bends what the background draws (the glow, the
  boids, the other blobs), not the page over it; WebGL2, so every browser that draws the blobs (the directive bends
  only in Chromium). `liquid` tunes it with the directive's optics (lenzi, 2026-11-20: "per regolare le varie proprietá
  dello stesso"): `{ bezel, thickness, ior, refraction, surface, saturation, blur }`, only what differs from
  `LIQUID_GLASS` (33 px, 72 px, 1.5, 1, `squircle`, 1.4, 0 px: 1.5 times the first lens, lenzi 2026-11-20: "un 1.5x"),
  each within `LIQUID_GLASS_LIMITS`. A part thinner than two bezels (a drop, a lobe) takes the lens smaller, its bezel
  ending at its middle: the bending comes down to nothing there, with no line. What is seen through it is more
  saturated (`saturation`; under 1, greyer) only as far as a colour takes it: no channel is cut at white or black (a cut
  drew a line through a drop over a lamp's light); `blur` softens it, a few px. One kind of glass for all the glass
  blobs of a background.
- **Thrown** (`throwable`, off; lenzi, 2026-11-14: "kinda like throwing them around"): the pointer takes a
  blob (a hand shows over one) and throws it; it flies on, slows down, bounces off the edges and drifts back
  to its path. Pressing on the page's own things (a link, a button, a field) never takes a blob.

## Rules

- **One glowing background per page.**
- **A blob is a deep shade of the accent** (half its light at `brightness` 1): text of the page must stay
  readable over it. Raise `brightness` only behind places without text.
- **The defaults are the kit's look**: change `count`, `size`, `spread` for a reason (a hero, a login page).
- **Surfaces over it** are `lenziLit` or solid; never half-transparent by hand.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `count` | `number` (16 at most) | `6` |
| input | `size` | `number`, share of the smaller side | `0.2` |
| input | `sizeVariety` | `number` 0..1 | `0.45` |
| input | `travel` | `number` 0..1 | `0.6` |
| input | `morph` | `number` (1: a new shape about every 6 s) | `0.5` |
| input | `spin` | `number`, turns a minute | `1.2` |
| input | `shapes` | `string[]` (`BLOB_SHAPE_NAMES`) | `DEFAULT_BLOB_SHAPES` |
| input | `merge` | `number` 0..1 | `0.35` |
| input | `soft` | `number` px | `2` |
| input | `pull` | `number` 0..1 (the pointer draws them) | `0` |
| input | `throwable` | `boolean` (the pointer throws them) | `false` |
| input | `materials` | `('lamp' \| 'glass' \| 'solid')[]`, each blob's, round again | `['lamp']` |
| input | `blobSizes` | `number[] \| null`, each blob's size (a share of the smaller side), round again | `null` |
| input | `glass` | `'frosted' \| 'liquid'` (`LenziGlassKind`), how the glass blobs look | `'frosted'` |
| input | `liquid` | `Partial<LenziLiquidBlobGlass> \| null`: `bezel`, `thickness` (px), `ior`, `refraction`, `surface`, `saturation`, `blur` (px) | `null` (`LIQUID_GLASS`) |
| input | `fill`, `accent`, `base`, `spread`, `seed`, `brightness`, `glow`, `halo`, `blur`, `speed`, `animate`, `pointer`, `resolution`, `lights` | every glowing background's | see Flock background |

## Example

```html
<lenzi-blob-background [count]="5" [blur]="24" />
```

## Origin

New in the kit (2026-11-13).

# Lit surfaces

`lenziLit` and `LenziAmbientLight` (`@lenzi/ui-kit/backgrounds`): a surface over a background takes its light
(lenzi, 2026-11-13: "the glow in the light should behave like the youtube backlight feature where elements get
slightly alominated by it", and YouTube's buttons "like they're glass ... responsive to flock / blob position
and color").

## What it does

- **Glass**: a lit surface keeps `--lenzi-lit-glass` of its colour (`--lenzi-lit-surface`, the page's surface
  unless set) and blurs what is under it, so the background shows through, where it is and in its colour.
- **The light**: a glowing background gives `LenziAmbientLight` a tiny picture of its light (32 × 18) about
  twelve times a second; every lit surface shows the part behind it as a veil (`--lenzi-lit-veil`) and along
  its border (`--lenzi-lit-rim`). It follows scrolling and resizing. A surface that scrolls itself keeps its light
  over what shows, not over what it held before scrolling (2026-11-17: a scrolled panel showed its light as a box
  ending halfway down).
- **The lamps' light too**: a glowing element near it (`lenziGlow`, see Glowing elements) lights it from the
  side that faces it, in its colour (`--lenzi-glow-veil`, `--lenzi-glow-rim`). A background whose blobs are lamps (a
  scene) gives both: its blobs light the surfaces from their side, and the light behind each surface lies along its
  border whole and over its colour as `--lenzi-lit-picture-veil` says (lenzi, 2026-11-17: "the buttons on top i think
  arent litElements or they aren't receiveing light properly"; with the lamps alone a card far from every blob was
  half as bright as the glass under it).
- **Its border takes the light only if it does not scroll itself** (2026-11-18): a surface that scrolls keeps its
  light inside and draws no line on its border; let what it holds scroll instead. One that clips (`overflow:
  hidden`) is cut at its border's outer edge, over the app's own rule, so the line lies on its border.
- **Nothing is read from the GPU** while no surface is lit.
- **Reduce transparency** (the kit's `LenziAppearance`, or the system's) makes lit surfaces solid and unlit.

## Rules

- **Only where the app asks**: cards and panels are solid ("Cards solid" in the rules); `lenziLit` is for
  surfaces over a background, chosen one by one.
- **Lit while there is a background** (lenzi, 2026-11-17: "wherever page we have a background cards or any elements
  over the background should turn into lit elements"): `[lenziLit]="overBackground"` makes it lit only while the app
  says so; off, the surface is the solid one it was and takes no light. `lenziLit` alone is always lit.
- **The amounts are global variables** (the Variables page): an app never changes them for one surface.
- **Over a plain background** a lit surface is glass only: a plain background sheds no light.

## API

| | Name | What |
| --- | --- | --- |
| directive | `[lenziLit]` | the element turns into a lit surface |
| input | `lenziLit` | `boolean`, `true`: lit; `false`, the surface without it (the attribute alone: `true`) |
| service | `LenziAmbientLight` | `wanted`, `attach(surface)`, `shine(...)`, `dim(source)`: used by the backgrounds |
| variable | `--lenzi-lit-glass` | `46%`: how much of its colour a lit surface keeps |
| variable | `--lenzi-lit-veil` | `34%`: the light over it |
| variable | `--lenzi-lit-rim` | `80%`: the light along its border |
| variable | `--lenzi-lit-picture-veil` | `50%`: under a background with lamps, how much of the veil the light behind gives (the border all of it) |
| variable | `--lenzi-lit-surface` | its colour (unset: `--mat-sys-surface`) |

## Example

```html
<lenzi-blob-background />
<mat-card appearance="outlined" lenziLit>…</mat-card>
<!-- lit only while the page has a background -->
<article class="card" [lenziLit]="overBackground()">…</article>
<button mat-stroked-button lenziLit type="button">Like</button>
```

## Origin

New in the kit (2026-11-13).

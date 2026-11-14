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
  its border (`--lenzi-lit-rim`). It follows scrolling and resizing.
- **Nothing is read from the GPU** while no surface is lit.
- **Reduce transparency** (the kit's `LenziAppearance`, or the system's) makes lit surfaces solid and unlit.

## Rules

- **Only where the app asks**: cards and panels are solid ("Cards solid" in the rules); `lenziLit` is for
  surfaces over a background, chosen one by one.
- **The amounts are global variables** (the Variables page): an app never changes them for one surface.
- **Over a plain background** a lit surface is glass only: a plain background sheds no light.

## API

| | Name | What |
| --- | --- | --- |
| directive | `[lenziLit]` | the element turns into a lit surface |
| service | `LenziAmbientLight` | `wanted`, `attach(surface)`, `shine(...)`, `dim(source)`: used by the backgrounds |
| variable | `--lenzi-lit-glass` | `46%`: how much of its colour a lit surface keeps |
| variable | `--lenzi-lit-veil` | `34%`: the light over it |
| variable | `--lenzi-lit-rim` | `80%`: the light along its border |
| variable | `--lenzi-lit-surface` | its colour (unset: `--mat-sys-surface`) |

## Example

```html
<lenzi-blob-background />
<mat-card appearance="outlined" lenziLit>…</mat-card>
<button mat-stroked-button lenziLit type="button">Like</button>
```

## Origin

New in the kit (2026-11-13).

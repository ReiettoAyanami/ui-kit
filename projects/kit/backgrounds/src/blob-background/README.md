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
- **Lights the page's `lenziLit` surfaces** (`lights`, on by default).
- **Decoration**: hidden from screen readers, never takes a click; the pointer is read from the window.

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
| input | `fill`, `accent`, `base`, `spread`, `seed`, `brightness`, `glow`, `halo`, `blur`, `speed`, `animate`, `pointer`, `resolution`, `lights` | every glowing background's | see Flock background |

## Example

```html
<lenzi-blob-background [count]="5" [blur]="24" />
```

## Origin

New in the kit (2026-11-13).

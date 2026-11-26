# Glass knob

`<lenzi-glass-knob>`: a control's knob, a piece of its own (`@lenzi/ui-kit/backgrounds`; lenzi, 2026-11-26: "rendi il
pomello la sua entità propria. Permettendo di cambiare la forma nelle forme dei blob per esempio, permettendo di
animare"). `<lenzi-glass-slider>` takes one as its content, or makes its own.

## Rules

- **White at rest, thin** (lenzi, 2026-11-26: "i pomelli più fini, leggermente più larghi della barra che hanno sopra,
  stessa lunghezza, magari leggermente più corti"): the kit's capsule 32 × 14, a little taller than a slider's rail (8),
  a circle 18, a bar 6 × 22, a blob 24 (`KNOB_SIZES`).
- **Held, a lens of Liquid Glass a little larger than itself** (lenzi: "si espande gradualmente diventando la lente
  leggermente più grande del pomello magari 25-50% ... qualcosa di non troppo grande"): `grow`, 1.35 (1.25 to 1.5 in the
  kit, never past 2), in `growDuration` (240 ms) with `growEasing` (a little past, then back). Let go, it shrinks back
  white. A dome, as every pill.
- **Any shape**: `capsule`, `circle`, `bar`, or one of the blobs' (`squircle`, `clover4`, `cookie9`, `flower`, `sunny`
  …, `BLOB_SHAPES`). Its glass may have its own (`lensShape`); by default the shape it has when it is grabbed.
- **A blob may turn** from shape to shape at rest (`morph`: the shapes it turns through, round; `morphDuration` each):
  the blobs' own way, their radii mixed, so it never tears. Held, it keeps the shape it had: **its glass never changes
  shape or size while it moves** (a new filter at every frame flickers: RULES.md, Controls of glass). Still with
  reduced motion.
- Its control places it, says when it is held (`held`) and focused (`focused`), and leaves room at its ends for its lens
  (`lensSize`).

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `shape` | `LenziKnobShape`: `'capsule' \| 'circle' \| 'bar' \| BlobShapeName` | `'capsule'` |
| input | `lensShape` | its glass's shape, held | `null` (the shape it has then) |
| input | `width`, `height` | px at rest | `KNOB_SIZES` for its shape |
| input | `grow` | how much larger its lens is (1.25 to 1.5) | `1.35` |
| input | `growDuration` | ms | `240` |
| input | `growEasing` | a CSS easing | `cubic-bezier(0.3, 1.35, 0.6, 1)` |
| input | `morph` | `BlobShapeName[]`: the shapes a blob turns through | `[]` (still) |
| input | `morphDuration` | ms a turn | `1600` |
| signal | `held`, `focused` | set by its control | `false` |
| computed | `size`, `lensSize` | px | |
| function | `knobOutline(width, height, from, to?, mix?)` | a blob's outline in px, between two shapes | |
| const | `KNOB_SIZES`, `KNOB_GROW`, `KNOB_GLASS` | the kit's sizes, growth and glass | |

## Example

```html
<lenzi-glass-slider label="Played" track="wave" [(value)]="played">
  <lenzi-glass-knob shape="cookie9" [morph]="['flower', 'clover4', 'sunny']" />
</lenzi-glass-slider>
```

## Variables

`--knob-width`, `--knob-height`, `--knob-lens-width`, `--knob-lens-height`, `--knob-grow`, `--knob-grow-duration`,
`--knob-grow-easing` (written by the component); `--lenzi-glass-thumb` (white); the glass: `KNOB_GLASS`.

## Origin

New in the kit, 2026-11-26: the slider's thumbs made a piece of their own, for the showcase's player (a blob that turns,
on a wavy rail).

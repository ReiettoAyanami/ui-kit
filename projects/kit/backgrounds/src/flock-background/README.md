# Flock background

`<lenzi-flock-background>` (`@lenzi/ui-kit/backgrounds`): a glowing flock behind the page (lenzi, 2026-11-13:
"The flocks need to be following the mouse (either approximately or like a precise target), need to behave
like a normal flocking animation and every variable should be configurable"). Boids in the accent colour keep
apart, head the same way and stay together, around the pointer or onto it.

## What it does

- **Boids** (Reynolds): separation, alignment, cohesion, each with its weight; a field of view; the fastest,
  the slowest and how hard a boid turns; a little wander of its own. A spatial grid keeps thousands cheap.
- **The pointer**: `follow="near"` flies around it, loosely; `follow="target"` flies onto it and slows to a
  stop; `none` ignores it. `followWeight` and `followRadius` say how much and from how far.
- **Edges**: `wrap` (back in from the other side) or `avoid` (turns away from `edgeMargin`).
- **Drawn with WebGL2, no library**: one instanced call, a dart pointing where it flies or a dot, added light
  (a crowd is brighter), optional `trails`.
- What every glowing background does: colours from the accent moved a little for each boid (`spread`), the
  glow around them, `blur`, stops out of view, a still picture with reduced motion, a CSS picture without
  WebGL2, the light on the page's `lenziLit` surfaces.

## Rules

- **One glowing background per page.**
- **Every number of the flock is an input**: an app sets only what it changes.
- **Behind text, keep it calm**: a few hundred boids, no trails; thousands are for a hero or a login page.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `count` | `number` (4000 at most) | `240` |
| input | `maxSpeed` / `minSpeed` | `number` px/s | `150` / `60` |
| input | `maxForce` | `number` px/s² | `220` |
| input | `perception` / `viewAngle` | `number` px / degrees | `70` / `270` |
| input | `separationDistance` | `number` px | `26` |
| input | `separation` / `alignment` / `cohesion` | `number` weights | `1.6` / `1` / `0.9` |
| input | `follow` | `'near' \| 'target' \| 'none'` | `'near'` |
| input | `followWeight` / `followRadius` | `number` / px | `0.9` / `140` |
| input | `wander` | `number` | `0.25` |
| input | `edges` / `edgeMargin` | `'wrap' \| 'avoid'` / px | `'wrap'` / `80` |
| input | `boidSize` | `number` px | `7` |
| input | `shape` | `'dart' \| 'dot'` | `'dart'` |
| input | `trails` | `number` 0..1 | `0` |
| input | `fill` | `'page' \| 'box'` | `'page'` |
| input | `accent` / `base` | a variable or a CSS colour | `'--mat-sys-primary'` / `'--mat-sys-surface'` |
| input | `spread` / `seed` | `number` | `0.2` / `1` |
| input | `brightness` / `glow` / `halo` | `number` | `1` / `1` / `0.6` |
| input | `blur` | `number` px | `0` |
| input | `speed` / `animate` / `pointer` / `lights` | `number` / `boolean` | `1` / `true` / `true` / `true` |
| input | `resolution` | `number`, device px per CSS px | `1` |

## Example

```html
<lenzi-flock-background follow="target" [count]="600" [trails]="0.4" />
```

## Origin

New in the kit (2026-11-13).

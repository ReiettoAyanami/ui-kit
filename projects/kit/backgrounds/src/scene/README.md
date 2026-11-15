# Scene

`<lenzi-scene [scene]="…">`: a glowing background described as data (lenzi, 2026-11-14: "una Scena e questa é
tipo la scena che usiamo nel background della home ... La scena si riferisce ad uno sfondo come quello in home
contenente boidi, blob, boidi-blob").

## What

- **A scene is plain data** (`LenziScene`): its blobs (each a material and a size), its fleets (boids or
  blob-boids, how many, in how many colonies, how wide), what the boids do with the pointer (`follow`) and
  whether the pointer throws the blobs (`throwable`). Plain JSON: it can be kept, listed and, next, shared by a
  link ("Voglio che peró una scena sia ricreabile tramite un link (corto) condivisibile e iframe").
- **`<lenzi-scene>` draws it**: with fleets the blobs and their flocks (`LenziBlobFlockBackground`), with only
  blobs the blob background (`LenziBlobBackground`, no flock to compute). Everything those do (materials,
  layers, lit surfaces, the cat's sights, reduced motion, the still picture without WebGL2) a scene does.
- **A fleet is its leader** ("si decide un capo e ogni capo avrá una flotta di n boidi. questa flotta avrá tutte
  le proprietá del leader, tranne la grandezza che va configurata a parte e anche il displacement della
  stessa"): each fleet flies as its own flock, with its leader's ways (`maxSpeed`, `minSpeed`, `separation`,
  `alignment`, `cohesion`, `wander`), which all of it takes; its `size` and `sizeVariety` are said apart. What a
  fleet does not say, the background gives its kind (blob-boids a little slower and closer than boids).

- **Every object is put somewhere, on a level, of a shape** (lenzi, 2026-11-14: "make every object selectable and
  moveable", "make the user decide the z index also by a property", "make user choose shape of blob"): a blob's
  and a leader's `x`, `y` (a share of the space; a fleet is born around its leader), their `layer` (an object
  stops only what is on its own; not said: glass on 1, the rest on 0), a blob's `shape` (kept; not said: it
  changes from one into another).
- **What each thing looks like** (lenzi, 2026-11-15: "it should be solid/glass and emitting/not emitting", "both for
  boids and blobs", "every blob and boid/blob boid leader should have a configurable color", "glass should have a
  tint parameter", "opzione color: multi ... colori tra cui shiftare come la home"): a blob or a blob-boid fleet is
  solid (`material: 'solid'`, opaque in its colour) or glass (`'glass'`), and shines or not (a solid that shines
  is `'lamp'`; glass that shines, `emitting: true`). Its `colour` (a `#rrggbb`), or `colours` it shifts among,
  slowly, each one at its own place along the loop; glass's `tint`, how much of its colour it takes. Boids take a
  colour or colours too.
- **Levels kept apart**: blobs and blob-boids of one material melt only on the same level; a higher level is drawn
  over a lower one ("same material blobs on different z index shouldnt fuse"). A lamp is solid: what is on a level
  under it (boids, blob-boids, lamps, solid things, glass) does not show through it; boids on its level or above fly
  over it (lenzi, 2026-11-15: "under solid blobs you can see the boids still"). Glass that shines covers nothing.
- **A blob that stays put** (`fixed`: it does not wander, it cannot be thrown) and **its weight** (`weight`, 0.25 to
  4: the heavier, the slower it turns; 2026-11-15: "an option to make a blob unmovable and a weigh parameter so
  that it spins more/less").
- **Solid things are lit surfaces**: their colour times the light that reaches them from beyond their edge, all round,
  less the farther in (the light outside every solid thing, shadows taken, blurred into them: a lamp beside one lights
  it, a lamp under it does not show through, one in another's shadow is dark; lenzi, 2026-11-15, "solid non emitting
  objects (the one on top) lets light get through still", "the shadows too"); dark far from light, coloured by it,
  their edge lit on the light's side. They are drawn into the picture before glass blurs it, so glass on their level
  or above (shining or not) shows them; opaque always. Their shadow takes all the glow behind them, with a soft edge
  (a lamp is wide: the edge is wider the farther from what casts it), and falls on solid things and glass too. A
  solid that shines (a lamp) is far brighter. Glass has a `tint` (how much its colour filters what is seen through it) and a
  `transparency` (how much shows through against its own body, itself lit). Within a level: lamps, solids, glass.
- **Currents** (`currents`; lenzi, 2026-11-14: "una corrente (definita da una serie di segmenti, con ognuno le sue
  forze indipendenti) che instrada i boidi e i blob verso la direzione del segmento (tipo una corrente marina)"):
  points (shares of the space), each segment's push (`strengths`, px/s²), a reach (`width`). Near a segment the
  boids are pushed along it and the blobs drift with it (a blob that stays put not at all, a heavy one less); out
  on one side, back on the other.
- **Being made** (`editing`, a scene maker paused; "the fleet should only be visible when playing the
  simulation"): no fleets, the blobs still on their places, nothing thrown, nothing carried by a current (a blob
  is drawn exactly where the scene puts it, whatever happened while it played; it plays on from there).

## Rules

- One scene a page, like any background: behind it (`fill="page"`) or behind a box (`fill="box"` in a
  `.lenzi-backdrop`).
- Surfaces over it are `lenziLit` or solid.
- An app keeps its scenes as data (a constant, a file, the server), never as a template full of attributes.

## API

| | Name | Type | Default | |
| --- | --- | --- | --- | --- |
| input | `scene` | `LenziScene` | required | what it draws |
| input | `fill` | `'page' \| 'box'` | `'page'` | behind the page, or behind its box |
| input | `animate` | `boolean` | `true` | off: a still frame |
| input | `editing` | `boolean` | `false` | being made: no fleets, the blobs still on their places |
| function | `sceneLayout(scene)` | `LenziSceneLayout` | | the scene as the backgrounds take it |

`LenziScene`: `{ name?, blobs: LenziBlobSpec[], fleets: { kind: 'boid' | 'blob-boid', material?, emitting?, colour?,
colours?, tint?, count, colonies?, size?, sizeVariety?, maxSpeed?, minSpeed?, separation?, alignment?, cohesion?,
wander?, x?, y?, layer? }[], follow?, throwable? }`; `LenziBlobSpec`: `{ material, size, emitting?, colour?, colours?,
tint?, shape?, x?, y?, layer?, fixed?, weight? }`.

## Example

```ts
readonly scene: LenziScene = {
  blobs: [{ material: 'lamp', size: 0.2 }, { material: 'glass', size: 0.2 }],
  fleets: [{ kind: 'boid', count: 380, colonies: 4 }, { kind: 'blob-boid', material: 'glass', count: 42, colonies: 3 }],
  follow: 'flee',
};
```

```html
<lenzi-scene [scene]="scene" />
```

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
- **Being made** (`editing`, a scene maker paused; "the fleet should only be visible when playing the
  simulation"): no fleets, the blobs still on their places, nothing thrown.

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

`LenziScene`: `{ name?, blobs: { material, size, shape?, x?, y?, layer? }[], fleets: { kind: 'boid' | 'blob-boid',
material?, count, colonies?, size?, sizeVariety?, maxSpeed?, minSpeed?, separation?, alignment?, cohesion?,
wander?, x?, y?, layer? }[], follow?, throwable? }`.

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

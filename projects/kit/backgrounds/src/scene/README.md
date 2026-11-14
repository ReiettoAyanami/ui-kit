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
- **Fleets today**: the boid fleets fly as one flock, each of their colonies a colony of it with its leader,
  sharing the flock's settings; each blob-boid fleet is a fleet of its own (`LenziBlobFlock`). A fleet with its
  own leader's settings comes next, with the scene editor.

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
| function | `sceneLayout(scene)` | `LenziSceneLayout` | | the scene as the backgrounds take it |

`LenziScene`: `{ name?, blobs: { material, size }[], fleets: { kind: 'boid' | 'blob-boid', material?, count,
colonies?, size? }[], follow?, throwable? }`.

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

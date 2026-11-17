# AI notes: Blobs and a flock

- `<lenzi-blob-flock-background />` from `@lenzi/ui-kit/backgrounds`, first in the page (or in a
  `.lenzi-backdrop` box with `fill="box"`). The inputs are the blob background's and the flock background's,
  with `blobs` and `boids` for their counts and `blobSize` for a blob's size.
- Materials and fleets, as the overview has them:
  `[materials]="['lamp', 'glass']"` (each blob's, round again), `[blobSizes]="[0.2, 0.2, 0.08, 0.08]"`,
  `[blobFlocks]="[{ material: 'glass', count: 16, colonies: 2 }, { material: 'lamp', count: 16 }]"`. Keep the
  arrays in the component's fields (constants), not in the template: a new array at every check makes the
  fleets again.
- Do not put a blob background and a flock background on the same page to get this: two canvases, and the
  boids would not fly round the blobs.
- The obstacles are a field (`blobEdge`, the material fields' own formula in TypeScript): if the blob
  shader (`engine/blob-materials.ts`, its `shapeRadius`) changes, change `blobEdge` with it, or the boids will
  fly over the blobs again.
- A fleet's rules are in `obstacles()`: the boids fly round everything; a fleet round what is of another
  material. Do not give a fleet the same `Boids` as the boids: they would flock together.
- Every flock is told where the pointer is (`setTarget`); what it does with it is its own settings' `follow`
  (a fleet's, else the `follow` input's). Do not hold the pointer back from all of them because the input says
  `none`: a fleet may say otherwise.
- `LenziSights` is how a watching cat finds the boids (of every flock): nothing to wire.

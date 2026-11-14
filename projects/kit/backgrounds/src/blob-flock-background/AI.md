# AI notes: Blobs and a flock

- `<lenzi-blob-flock-background />` from `@lenzi/ui-kit/backgrounds`, first in the page (or in a
  `.lenzi-backdrop` box with `fill="box"`). The inputs are the blob background's and the flock background's,
  with `blobs` and `boids` for their counts and `blobSize` for a blob's size.
- Do not put a blob background and a flock background on the same page to get this: two canvases, and the
  boids would not fly round the blobs.
- The obstacles are a field (`blobEdge`, the shader's own formula in TypeScript): if the blob shader changes,
  change `blobEdge` with it, or the boids will fly over the blobs again.
- `LenziSights` is how a watching cat finds the boids: nothing to wire.

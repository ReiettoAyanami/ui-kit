# AI notes: Blobs and a flock

- `<lenzi-blob-flock-background />` from `@lenzi/ui-kit/backgrounds`, first in the page (or in a
  `.lenzi-backdrop` box with `fill="box"`). The inputs are the blob background's and the flock background's,
  with `blobs` and `boids` for their counts and `blobSize` for a blob's size.
- Do not put a blob background and a flock background on the same page to get this: two canvases, and the
  boids would not fly round the blobs.
- The obstacles are the blobs' round outline at their radius; a boid may skim a lobe (it is pushed out only
  past 86% of the radius). Do not change `Boids` to make it exact: the shapes change all the time.
- `LenziSights` is how a watching cat finds the boids: nothing to wire.

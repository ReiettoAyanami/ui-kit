# AI notes: Scene

- A page's glowing background with blobs, boids and blob-boids is a **scene**: write it as a `LenziScene` (a
  constant of the app, or data from its server) and give it to `<lenzi-scene>`. Do not spell the same thing out
  as attributes of `LenziBlobFlockBackground` in a page.
- Phones get a lighter scene of their own (fewer blobs, no fleets): pick the scene, not attributes, by the
  viewport.
- A scene behind words that should move as the page scrolls: `scroll` (0.5 is a calm parallax, 1 moves with the
  words, below 0 against them). Never move the flock from the app with a scroll listener of its own.
- Keep a scene JSON: no functions, no class instances, nothing a link could not carry.
- Never: two scenes on one page; a scene inside a card (a scene in a box is `fill="box"` in a `.lenzi-backdrop`).

# AI notes: Scene

- A page's glowing background with blobs, boids and blob-boids is a **scene**: write it as a `LenziScene` (a
  constant of the app, or data from its server) and give it to `<lenzi-scene>`. Do not spell the same thing out
  as attributes of `LenziBlobFlockBackground` in a page.
- The page over the scene is `<main lenziGlassPage>`, its cards `[lenziLit]="lit()"` with `lenziOverBackground()`
  (`glass-page/AI.md`): never a flag of your own saying the scene is there.
- Phones get a lighter scene of their own (fewer blobs, no fleets): `<lenzi-scene [scene]="scene"
  [phoneScene]="phoneScene" />`, both constants of the app. Never choose it in the page's code (no `matchMedia`, no
  `lenziPhone()` for this): the scene changes it with the window.
- Keep a scene JSON: no functions, no class instances, nothing a link could not carry.
- Never: two scenes on one page; a scene inside a card (a scene in a box is `fill="box"` in a `.lenzi-backdrop`).

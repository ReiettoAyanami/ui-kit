# AI notes: Flock background

- Import `LenziFlockBackground` from `@lenzi/ui-kit/backgrounds`; once per page, first in the template, or in
  a `.lenzi-backdrop` box with `fill="box"`.
- Set only the inputs you change; the defaults (`DEFAULT_BOIDS`) are the kit's flock.
- Never run your own boids or `requestAnimationFrame`: `Boids` is exported for an app that draws its own, and
  only then.
- `follow="target"` gathers the whole flock on the pointer: use it where the pointer is the point (a hero),
  `near` elsewhere.
- Colours: theme variable names for `accent` and `base`. A page with a glowing background is a lazy route.

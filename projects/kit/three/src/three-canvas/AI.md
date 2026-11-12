# AI notes: three.js canvas

- Import from `@lenzi/ui-kit/three`; the app installs `three`. Import from three only the classes the scene
  uses.
- The setup only fills the scene and returns `frame`; never start your own `requestAnimationFrame`, never
  resize the renderer.
- A new shape is a new `setup` (a `computed`); a speed or a position read inside `frame` needs no new setup.
- Lazy route, an honest `label`, theme colours.

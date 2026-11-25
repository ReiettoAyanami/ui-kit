# AI notes: Glass slider

- `import { LenziGlassSlider } from '@lenzi/ui-kit/backgrounds'`.
- Save on `(valueChange)` with a pause (the value moves at every step of a drag), or when the drag ends.
- Show the value beside it as a figure when it matters (`LenziFigure`), formatted by the page.
- Never a native `<input type="range">` in an app.
- The thumb's glass is made by the kit (`glassLens`): never a `lenziLiquidGlass` of your own on it.

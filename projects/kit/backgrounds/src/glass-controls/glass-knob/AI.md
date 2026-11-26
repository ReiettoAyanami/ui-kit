# AI notes: Glass knob

- `import { LenziGlassKnob } from '@lenzi/ui-kit/backgrounds'`.
- Put it inside its control, as its content: `<lenzi-glass-slider …><lenzi-glass-knob shape="flower" /></lenzi-glass-slider>`.
  Without one, the slider makes its own (its `thumb` and `lens` inputs choose its shapes).
- Keep the kit's sizes (`KNOB_SIZES`) and growth (1.25 to 1.5); a larger knob only when the page asks for it.
- A blob that turns: a few shapes (`morph`, 2 to 4), `morphDuration` above a second; never a knob that changes size or
  shape while held.
- Never a fill, a border, a `backdrop-filter` or a `lenziLiquidGlass` of your own on it: its glass is made by the kit.

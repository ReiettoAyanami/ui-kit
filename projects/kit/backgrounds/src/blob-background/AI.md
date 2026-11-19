# AI notes: Blob background

- Import `LenziBlobBackground` from `@lenzi/ui-kit/backgrounds`; put it once, first in the page's template (it
  is fixed behind the page) or in a `.lenzi-backdrop` box with `fill="box"`.
- Never draw blobs with CSS, an SVG or another canvas: this is the one way, and it already stops out of view,
  respects reduced motion and has a fallback.
- Colours: pass a theme variable name to `accent` and `base`, never a hex the theme has.
- Do not raise `brightness` behind text; check the contrast of the text over a blob before presenting.
- Liquid glass is `glass="liquid"` (tuned with `[liquid]`), never a `lenziLiquidGlass` over a blob: the directive
  bends the page over a still box, the background bends its own blobs as they move. It needs something behind it to
  bend (other blobs, a flock): glass blobs alone over the plain base show only their edge.
- Shapes are names from `BLOB_SHAPE_NAMES`; an unknown name is dropped silently, so check the spelling.
- A page with a glowing background is a lazy route.

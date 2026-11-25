# AI notes: Liquid Glass

- `import { LenziLiquidGlass } from '@lenzi/ui-kit/backgrounds'`; `lenziLiquidGlass` on the element that is the glass
  (a window, a bar, a button). Give it its corners (`border-radius`) and padding in the app; nothing else.
- Never give it a border, a background, a box-shadow or a `backdrop-filter` of its own: the directive sets the filter,
  the rim is its border.
- Never `lenziLit` or `lenziSolid` on the same element: one material per element.
- It bends what is behind it: put it over a scene or a picture. Check it in Chrome; elsewhere it is only blurred.
- A whole app of it: `provideLenziLiquidGlass()` in the app's providers and a scene behind the shell; mark the app's own
  panels `.lenzi-surface` (never `lenziLiquidGlass` on each card, never a fill of your own on them). No `lenziGlassPage`
  then: the surfaces are the glass.

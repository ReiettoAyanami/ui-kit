# AI notes: Liquid Glass

- `import { LenziLiquidGlass } from '@lenzi/ui-kit/backgrounds'`; `lenziLiquidGlass` on the element that is the glass
  (a window, a bar, a button). Give it its corners (`border-radius`) and padding in the app; nothing else.
- Never give it a border, a background, a box-shadow or a `backdrop-filter` of its own: the directive sets the filter,
  the rim is its border.
- Never `lenziLit` or `lenziSolid` on the same element: one material per element.
- It bends what is behind it: put it over a scene or a picture. Check it in Chrome; elsewhere it is only blurred.
- A whole app of it: `provideLenziLiquidGlass()` in the app's providers and a scene behind the shell: every surface is
  glass by itself (cards, `.lenzi-surface`, lit surfaces, the pane of `lenziGlassPage`). Never `lenziLiquidGlass` on each
  card, never a fill, a border or a `backdrop-filter` of your own on them. A fill of the app's own: only
  `:not(.lenzi-lit)` on a lit surface.
- Never light its edge from script (the pointer, a fixed angle, the boids): the filter lights it with what is under it
  (lenzi, 2026-11-26: "no il mouse o roba che ti inventi").
- `litOnly` only on a demo of lit glass; a lamp (`lenziGlow`) stays a light by itself.

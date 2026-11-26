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
- Glass holds glass (lenzi, 2026-11-26: "solo quelli che volevi te", "non funziona con altri layer di liquidglass"): never a
  mask, a filter, an opacity under 1 or a mix-blend-mode on an element that holds glass (a row that fades, a wrapper
  that dims): the glass inside it would bend nothing under it. Fade or dim the glass's content, never what holds it.
- Never style a glass's `::before`: it is the glass's layer (`lenzi-liquid-layered`). Never a `backdrop-filter` of your
  own on anything that holds glass, for the same reason as above.
- A glass that moves (a control's thumb, a lens, a capsule): animate its `translate` and `scale` only, never its width or
  height (a new filter at every frame: it flickers); give it room in a scroller; never slide its bezel over lines of
  text (lenzi, 2026-11-26: "si taglia e soprattutto fa degli sfarfallii strani prima di arrivare"). RULES.md, Controls of
  glass.
- An entering animation of something that holds glass (opacity, filter, transform with opacity): `backwards`, never
  `both` or `forwards` (a filling opacity animation keeps it a backdrop root after it ends).

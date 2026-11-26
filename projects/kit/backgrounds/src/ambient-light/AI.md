# AI notes: Lit surfaces

- Import `LenziLit` from `@lenzi/ui-kit/backgrounds` and put `lenziLit` on the surface (a `mat-card`, a
  button, a bar of the page); nothing else to wire.
- Never call `LenziAmbientLight` from an app: the backgrounds feed it, the directive reads it.
- Do not light every card by default: ask, or follow the app's design; a solid card stays solid.
- Over a background, light the page's own surfaces (cards, panels, a card's ⋮) and only while the background is
  there: `lit = lenziOverBackground()` and `[lenziLit]="lit()"` (RULES.md, 2026-11-17; `glass-page/AI.md`). Not what is inside them. A surface that sets its
  own `background` in the app's CSS: set it only `:not(.lenzi-lit)`, or it covers the glass. A coloured surface
  keeps its colour lit with `--lenzi-lit-surface` (its colour, not an amount).
- Never tune glass, veil or rim per surface in an app: they are global variables of the kit.
- In an app of Liquid Glass the same `lenziLit` is Liquid Glass: write nothing else. `litOnly` only on a demo of lit
  glass.
- Check the contrast of the text on a lit surface over the brightest part of the background before presenting.
- **A lit surface does not scroll itself**: let what it holds scroll (`overflow: hidden` on the surface, `overflow:
  auto; min-height: 0` on its content). A surface that scrolls keeps its light inside and takes none on its border
  (the line of light cannot lie on a scroller's border): lenzi, 2026-11-18, the scene maker's list grey along its edge
  beside a large lamp, "lo stesso identico problema".

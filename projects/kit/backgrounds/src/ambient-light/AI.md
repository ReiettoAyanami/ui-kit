# AI notes: Lit surfaces

- Import `LenziLit` from `@lenzi/ui-kit/backgrounds` and put `lenziLit` on the surface (a `mat-card`, a
  button, a bar of the page); nothing else to wire.
- Never call `LenziAmbientLight` from an app: the backgrounds feed it, the directive reads it.
- Do not light every card by default: ask, or follow the app's design; a solid card stays solid.
- Never tune glass, veil or rim per surface in an app: they are global variables of the kit.
- Check the contrast of the text on a lit surface over the brightest part of the background before presenting.

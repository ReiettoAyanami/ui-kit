# AI notes: Glowing elements

- Import `LenziGlow`, `LenziLit`, `LenziSolid` from `@lenzi/ui-kit/backgrounds`; put the directive on the
  element itself (a `mat-fab`, a button, a `mat-card`, a `mat-list`, a chip, a toggle group).
- One material per element: never two of `lenziGlow`, `lenziLit`, `lenziSolid` together (a lamp is already lit).
- Switch a lamp with `[lenziGlow]="state()"`, never by adding or removing the element: it fades.
- Never draw a glow or a shadow of your own (`box-shadow`, `filter: drop-shadow`) on these elements: this is
  the one way, and it is what lights and shades the elements around them.
- Never put content into an element through an `ng-template` declared outside it when the element places its
  children by query (a button's icon, a toggle group's toggles): they lose their place.
- Never give a container of glass a `backdrop-filter`, a `filter`, an `opacity` under 1 or a `mix-blend-mode`
  (nor to its pseudo-elements): Chrome then blurs, under the glass inside it, only what that container
  draws, and the words under the glass stay sharp. A floor is `lenziLit` + `lenzi-lit-under`, which has none.
- Few lamps per page, and only for something alive; ask lenzi before lighting a whole list.
- Never call `LenziLightField` from an app: the directives and the backgrounds use it.
- Words over a glowing background that block its light, with beams towards the viewer: `lenziSolidText` on each block
  of words (a heading and its paragraph) and one `<lenzi-light-rays />` in the page, after its content. Never
  `lenziSolid` on the words, never a `text-shadow` or copies of the text of your own.

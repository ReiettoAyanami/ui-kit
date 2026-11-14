# AI notes: Glowing elements

- Import `LenziGlow` (and `LenziLit` for what is only lit) from `@lenzi/ui-kit/backgrounds`; put `lenziGlow`
  on the element itself (a `mat-fab`, a button, a `mat-card`, a `mat-list`, a chip, a toggle group).
- Never `lenziGlow` and `lenziLit` on the same element: a lamp is already lit (Angular refuses the pair).
- Switch it with `[lenziGlow]="state()"`, never by adding or removing the element: it fades.
- Never draw a glow of your own (`box-shadow`, `filter: drop-shadow`) on an element: this is the one way, and
  it is what lights the elements around it.
- Few lamps per page, and only for something alive; ask lenzi before lighting a whole list.
- Never call `LenziLightField` from an app: the two directives use it.

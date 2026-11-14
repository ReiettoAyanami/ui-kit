# AI notes: Background

- Import `LenziBackground` from `@lenzi/ui-kit/backgrounds`; put it once, first thing in the page (or in the
  box, and give the box `class="lenzi-backdrop"` with `fill="box"`).
- Never a `background-image` of your own on `body` or on a page: this is the one way.
- A colour is a theme variable name (`--mat-sys-surface`), never a hex the theme already has.
- Over a photo, check the contrast of the page's text and raise `dim` until it reads; say what you chose.
- Cards that must show the picture get `lenziLit`; do not lower a card's opacity by hand.

# AI notes: Bento grid

- `import { LenziBento, LenziBentoTile } from '@lenzi/ui-kit'`. The grid is `<lenzi-bento>`, every child a tile.
- Choose the sizes by importance before writing: one largest tile, a few medium, the rest small; six to nine tiles.
- A tile that opens a page is `<a lenziBentoTile routerLink="…">` (import `RouterLink`), not a button inside it.
- Never give a tile a fill, border, radius or shadow in the app: it is the kit's panel (and the app's glass in an app of
  Liquid Glass). Lay out what is inside it with a little flex or grid of the page's own.
- Write the tiles in the order a phone should show them.
- Not for many things of one kind: a list of cards is a grid of equal cards.

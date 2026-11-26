# AI notes: Shelf

- `import { LenziShelf } from '@lenzi/ui-kit'`. Its children are the things, one element each (a `@for` straight
  inside it): no wrapper around them, the shelf lays its children out.
- Give each shelf its `count` when the page knows how many there are in the whole group (a search may show fewer).
- Its things are the kit's cards: `LenziPreviewCard` (a preview that moves starts only when pointed at), or a link card
  of the page. Never a fixed width on them: `--lenzi-shelf-item` on the shelf, if 280 px is not right.
- Stack shelves in a column with a gap of 24 to 32 px; never two side by side.
- Never make the page scroll sideways around it; never a scroll bar of your own on it.

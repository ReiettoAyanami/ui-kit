# AI notes: Preview card

- Lay the cards out in a grid of the page (`grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`, a
  small gap: the cards have their own padding). Never put one inside a `mat-card`: it is the card.
- The preview is the first thing inside it: an `<img alt="">`, or an `<iframe>` with a `title`, `loading="lazy"`
  and `tabindex="-1"` (the card's button is the one stop of the keyboard). It never takes the pointer: the
  card's button lies over it, so do not expect clicks or hovers inside the preview.
- A preview that moves (a scene, a video): still until `activeChange` says `true`, still again on `false`. Tell a
  frame to start and stop with a message (`postMessage`), never by changing its `src` (it would load again).
- `lines`: one fact each, already formatted ("6 blobs, 3 fleets" is one fact: what it holds). No "·".
- The menu: `<lenzi-card-menu>` inside the card, with a `label` that names it; Delete `destructive` and asked
  first (`LenziConfirmDialog`). A card nothing can be done to has no menu.
- `opened` is the tap: navigate, or open the details. Never also bind `(click)` on the card.

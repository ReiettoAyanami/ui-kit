# AI notes: Colour picker

- Every colour the user may change is shown as this swatch, in place: never `<input type="color">`, never a
  separate "change colour" button, never a text field alone.
- Give it a `label` that says what the colour is ("Shift colour"), not "colour picker".
- Save on `(picked)` (the selector closed with another colour), not on every `valueChange`: the value moves
  at each step of a drag.
- Offer the app's own colours with `[choices]` when it has a palette; decide the palette once, in the app's
  design, and name each colour.
- It works in opaque sRGB hex: a colour with transparency loses it. Do not use it for an identity colour,
  which is computed from an id and never chosen by hand.
- Put the name of what it colours beside it, bold, and the hex under the name if it must be read: never the
  two on one line.

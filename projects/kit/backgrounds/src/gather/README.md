# Gathering the boids

A zone of the page the boids of a flock background gather under (lenzi, 2026-11-19: "i boidi devono rimanere sulla
zona di testo e spostarsi al prossimo scroll velocemente verso la nuova zona di testo e andare sotto tutta a quella
zona di testo").

## What

- **`lenziGather`** on any element (a block of text, a section): the boids of `<lenzi-flock-background>`,
  `<lenzi-blob-flock-background>` and `<lenzi-scene>` gather under it.
- **One zone at a time**: of the zones on the page, the one the window shows most of. Scrolled to another, that one.
- **Out of it, they hurry**: up to 4 times their top speed when far, slowing to their own as they come in.
- **In it, they cover all of it**: each boid keeps to its own place in the box, the places spread evenly and drifting
  slowly along it and back, so the flock lies under the whole zone and still moves.
- How hard they keep to it is the background's `gather` (2; 0: they ignore the zones).
- No zone on the screen: they fly as they would without any.

## Rules

- **The zone is the box of what it marks**: put it on the block of text, not on a section a screen tall, or the
  boids spread over the empty part too.
- A flock covers as much as it has boids: a zone wider than the flock gets a thin cover. Size the fleets for the
  largest zone.
- Scares (`lenziScare`) still scare them out of a zone.

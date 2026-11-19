# Gathering the boids

A zone of the page the boids of a flock background gather under (lenzi, 2026-11-19: "i boidi devono rimanere sulla
zona di testo e spostarsi al prossimo scroll velocemente verso la nuova zona di testo e andare sotto tutta a quella
zona di testo").

## What

- **`lenziGather`** on any element (a block of text, a section): the boids of `<lenzi-flock-background>`,
  `<lenzi-blob-flock-background>` and `<lenzi-scene>` gather under it.
- **One zone at a time**: of the zones on the page, the one the window shows most of. Scrolled to another, that one.
- **Out of it, they hurry**: up to 6 times their top speed when far, slowing to their own as they come in.
- **Four streams, apart on the way, together on arrival** (lenzi, 2026-11-19: "usa 4 punti di target così che si
  spalmano meglio sulla zona di testo"; "quando si muovono tra una zona e l'altra che si dividano un po' di più e
  tornino lì che si uniscono"): the boids are dealt round the zone's four quarters; far off, each hurries to its
  quarter's point, fanned out aside from the way and holding to no other boid; near, into its own place in its
  quarter, where the flock comes together again (blob-boids melt into one cover).
- **Under each line of its text** (lenzi, 2026-11-19: "usa più zone nell'area di testo altrimenti i boidi si mettono
  solo su una parte della scritta"): a zone with text is its lines (`linesOf`, from the browser's boxes of the text),
  not its whole box; one without text (a picture) is its box. The boids are shared among the lines by their length.
- **They cover all of it**: each boid keeps to its own place in its quarter of its line, the places spread evenly and drifting slowly
  along it and back, so the flock lies under every line and still moves. Kept to a zone, the boids hardly hold
  together (a fifth of their cohesion) and follow no leader: otherwise they bunch up on one part of the words.
- How hard they keep to it is the background's `gather` (2; 0: they ignore the zones).
- No zone on the screen: they fly as they would without any.

## Rules

- **Put it on the block of text** (a heading and its paragraph): its lines are where the boids go. On a section a
  screen tall with no text of its own, they would cover its empty box.
- A flock covers as much as it has boids: a zone wider than the flock gets a thin cover. Size the fleets for the
  largest zone.
- Scares (`lenziScare`) still scare them out of a zone.

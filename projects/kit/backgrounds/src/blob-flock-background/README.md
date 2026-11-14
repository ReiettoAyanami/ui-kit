# Blobs and a flock

The blob background and the flock background in one (lenzi, 2026-11-14: "Make a background that is the
combination of flocks and blobs the latter being a obstacle for the flocks").

## What

- **The blobs** drift, turn, change shape and melt into each other, as the blob background's
  (`blobs`, `blobSize`, `sizeVariety`, `travel`, `morph`, `spin`, `shapes`, `merge`, `soft`).
- **The flock** flies as the flock background's (`boids`, the speeds, the three rules, `follow` the pointer,
  `wander`, `boidSize`, `shape`, `trails`), and **round the blobs**: near one a boid turns away and slides
  along its edge; one that a blob drifts onto is pushed out of it. `avoid` is how hard they turn away
  (0: they fly through). The edge is the one drawn (each blob's shape, melted where two meet), and a boid
  stays outside it by its own length: none of it is ever drawn over a blob (2026-11-14: they were let in up
  to 86% of a round outline, and a circle or a squircle reaches its full radius).
- **Colonies** (`colonies`, 4; lenzi: "aumenta le colonie"): flocks of their own. A boid heads the same way
  as, and stays with, only its own colony; it keeps apart from every boid. 380 boids by default, 9 px wide
  (`boidSize`; "make them a bit bigger").
- **Thrown blobs** (`throwable`; lenzi, 2026-11-14: "drag the blobs around ... kinda like throwing them
  around"): the pointer takes a blob (a hand shows over one) and throws it; it flies on, slows down, bounces
  off the edges and drifts back to its path. The boids fly round it wherever it goes. Pressing on the page's
  own things (a link, a button, a field) never takes a blob.
- **Scared boids**: `follow="flee"` makes the pointer something they run from ("the mouse is a scare away (not
  obstacle)"); `lenziScare` makes any element scary (`scare`: how much). See `scare/README.md`.
- **The blobs light** the page's lit surfaces (`lenziLit`), as the blob background's do; solid elements
  cast shadows from them.
- **The boids are something to look at**: a watching cat (`<lenzi-cat expression="watching">`) looks at the
  nearest boid when the pointer is not on the page (`LenziSights`).
- Everything every glowing background does (the accent and base colours, the glow, the frame loop, reduced
  motion, the still picture without WebGL2) is the same as the others'.

## Rules

- One background a page, behind it (`fill="page"`) or behind a box (`fill="box"` in a `.lenzi-backdrop`).
- The edges wrap: a boid that leaves on one side comes back on the other.
- Surfaces over it are `lenziLit` or solid; never half-transparent by hand.

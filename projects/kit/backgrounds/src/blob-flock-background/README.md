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
  (`boidSize`; "make them a bit bigger"), drops (`shape="drop"`), each a little different in size
  (`boidSizeVariety`); each colony's leader larger (`leaderSize`) and a little followed (`leaderPull`), as in
  the flock background.
- **Thrown blobs** (`throwable`; lenzi, 2026-11-14: "drag the blobs around ... kinda like throwing them
  around"): the pointer takes a blob (a hand shows over one) and throws it; it flies on, slows down, bounces
  off the edges and drifts back to its path. The boids fly round it wherever it goes. Pressing on the page's
  own things (a link, a button, a field) never takes a blob.
- **Scared boids**: `follow="flee"` makes the pointer something they run from ("the mouse is a scare away (not
  obstacle)"); `lenziScare` makes any element scary (`scare`: how much). See `scare/README.md`.
- **Blobs of a material** (`materials`, each blob's in order, round again; lenzi, 2026-11-14: blobs "di vetro
  o solidi"): `lamp` (the glowing blobs), `glass` (it blurs what is behind it and takes the light around it,
  on its face and along its edge, as the page's glass), `solid` (the page's surface, its edge lit on the side
  of the light, and a hard shadow on the glow behind it, the shadow following its shape). Blobs melt only
  into blobs of their own material. `blobSizes` gives each blob its own size ("un blob grande, un/due blob
  piccoli dello stesso materiale").
- **Fleets of blob-boids** (`blobFlocks`: `{ material, count, colonies?, size? }`; "un tipo di boid che puó
  essere un blob di qualsiasi materiale"): boids that are blobs, drops as the boids are ("i blob boidi fai che
  siano gocce pure loro": a round head `size` px wide, 11 by default, narrowing to a round tail, pointing
  where it flies; each a little different, the leader larger), a little slower than the boids and kept apart
  by their length. A lamp drop shines brighter than a lamp blob (it is small; a blob is a deep shade for the
  words over it). A fleet flocks only with itself, melts only
  into the blobs and blob-boids of its own material, and flies round the blobs and blob-boids of another
  ("possono blobbarsi solo assieme ai blob e blob-boid dello stesso materiale ... quelli dell'altro materiale
  sono ostacoli"). The boids fly round every blob and every blob-boid ("per loro tutti i blob sono ostacoli").
- **Fleets with a leader's ways** (`boidFlocks`, and the same numbers on a `blobFlocks` fleet; lenzi, 2026-11-14:
  "ogni capo avrá una flotta di n boidi. questa flotta avrá tutte le proprietá del leader, tranne la grandezza
  ... e anche il displacement"): given `boidFlocks`, the boids are those fleets, each its own flock with its
  own count, colonies, size, `sizeVariety` and its leader's speeds, rules, wandering and `follow` (what it does
  with the pointer, a fleet apart: 2026-11-17, "This should be configurable for every boid"); what a fleet does
  not say is the inputs'. Without it, one flock of `boids` in `colonies`, as before. A scene (`LenziScene`) gives them.
  A fleet with `x`, `y` (a share of the space) is born around its leader there, not already flying; a boid
  fleet's `layer` is its own level (`boidLayer` when not said).
- **Blobs one by one** (`blobSpecs`, `LenziBlobSpec`; a scene's): each its material and size and, when said, its
  place (it wanders from there), shape (kept), level, colour or colours to shift among, glass's tint and shining,
  whether it stays put (not wandering, not thrown), its weight (the heavier, the slower it turns, the more it sinks to
  the floor and the less a current carries it; lighter than 1, it rises) and whether it
  is an obstacle (`obstacle`: the blobs of another material on its level bounce off it, the heavier or larger one
  pushed less; its own material melts into it, the flocks keep their rules). Given, it is
  the blobs; without it, `blobs`, `materials`, `blobSizes` and `blobLayers` as before. A fleet takes `colour`,
  `colours`, `tint` and `emitting` too.
- **Currents** (`currents`, `LenziCurrent`: points, each segment's push up to `STRONGEST_CURRENT`, a reach): near a
  segment the boids are turned along it and carried by it past their own top speed (`Boids.setFlow`,
  `Boids.carriedX`/`carriedY`) and the blobs drift with it (`BlobDrift`). The blob background takes them too.
- **Levels kept apart**: one field per level (up to four), drawn from the lowest up: blobs of one material on two
  levels do not melt, the higher drawn over the lower. A solid thing without a colour is in its tint, not the
  page's colour (2026-11-15: "solid shouldn't be trasparent"). The light is drawn level by level too: each level's
  lamps, then its boids; a lamp (solid) first takes away the light of the levels under it where it is, so boids,
  blob-boids and lamps under it do not show through ("under solid blobs you can see the boids still"), and the
  solid things and glass under it are not drawn there. Glass that shines only adds its light, of the glass's own
  shape and colour (a field apart from the lamps': a lamp and shining glass of one level never melt into one shape
  of light; "solid and glass interacting").
- **Layers** (z-levels; lenzi, 2026-11-14: "the z-index of the blobs decides which is an obstacle to what
  (they're obstacles only to objects that are on the same z-level)"): something stops only what is on its
  own layer. By default the lamps, the solid things, the boids and the lamp blob-boids are on layer 0 and
  stop each other as before; glass (blobs and blob-boids) is on layer 1, above them, so they fly under it,
  seen through it ("the glass boidsblobs and blobs on top of them so that they can go under").
  `materialLayers` sets a material's layer (`MATERIAL_LAYERS`: lamp 0, glass 1, solid 0), `blobLayers` a
  blob's own, a fleet's `layer` its own, `boidLayer` the boids'. The layers say what stops what and what is
  drawn over what (a higher level over a lower one; within a level: lamps, boids, solid things, glass).
- **Zones they gather under** (`lenziGather` on an element of the page; `gather`, 2, how hard; lenzi, 2026-11-19): of
  the zones, the one the window shows most of; out of it they hurry there, in it they cover all of it. See
  `gather/README.md`.
- **Where the boids live** (`space`, `'screen'` by default): `'page'`, the whole page; the boids and blob-boids scroll
  with it and fly across it, turning at its edges (`edges` 'avoid'), born where the window is. The blobs stay on the
  window.
- **Small boids are a little slower and follow from a little farther** (`sizeSpeed`, `sizeReach`; "che
  naturalmente i piú grandi stanno in testa"): the large ones, the leaders, end up ahead.
- **The lamp blobs light** the page's lit surfaces (`lenziLit`), as the blob background's do; solid elements
  cast shadows from them. Glass and solid blobs shed no light.
- **The boids are something to look at**: a watching cat (`<lenzi-cat expression="watching">`) looks at the
  nearest boid when the pointer is not on the page (`LenziSights`).
- Everything every glowing background does (the accent and base colours, the glow, the frame loop, reduced
  motion, the still picture without WebGL2) is the same as the others'.

## Rules

- One background a page, behind it (`fill="page"`) or behind a box (`fill="box"` in a `.lenzi-backdrop`).
- The edges wrap: a boid that leaves on one side comes back on the other.
- Surfaces over it are `lenziLit` or solid; never half-transparent by hand.
- Glass and solid blobs need half-float targets (nearly every WebGL2); without them the still picture shows.

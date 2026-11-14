# The cat

lenzi's cat (2026-11-14, "gatto_icona": "prendi i png che stanno qua, trasformali in svg e fammi una pagina
dove posso vedere gli effetti dei materiali sulle varie icone. Se riesci animalo un pochetto"): the drawing,
traced into vectors, in the theme's colours.

## What

- **An expression over a back** (lenzi, 2026-11-14: "make me choose what expression and what back to use"):
  `expression` is `happy`, `sleepy`, `sad`, `watching` or `none` (seen from behind); `back` is `plain` or
  `hard-hat` (something being built). Any expression goes over either back.
- **Watching** (lenzi, 2026-11-14: "make it so that it follows the mouse cursor with the eyes a bit"): the
  happy face's open eyes turn towards the pointer, the rest of the face leaning a little the same way. No
  pupils (2026-11-14: "nu pupils wth"): the eyes are lenzi's, empty ovals. When the pointer is not on
  the page (it left the window, or a touch screen), it looks at the nearest boid of a flock on the page
  (`LenziSights`: nothing to set), or straight ahead.
- **A material shaped as the cat** (`material`): its body takes it inside its outline, not in a box.
  - `plain`: the page's surface, a little lighter than the page (`--lenzi-cat-fill`).
  - `glass`: a lit surface (`lenziLit`): the background and the lamps' light show through it.
  - `lamp`: a glowing element (`lenziGlow`): its lines glow in its colour (`glowColor`), and it lights the
    lit surfaces around it (`glowStrength`, `glowReach`, as `lenziGlow`).
  - `solid`: a solid element (`lenziSolid`): on a lit floor it casts the cat's shadow, not a box's: its
    outline, hollows too (the gap between its ears, the curve of its tail).
- **Its lines** are its border: the theme's text colour (`--lenzi-cat-ink`), the lamp's colour when it is a lamp.
- **A little life** (`animated`, on by default): it breathes, blinks (not when sleepy: its eyes are closed)
  and twitches its whiskers. Nothing moves with reduced motion.
- **Its size** (`size`, px): its width; its height follows the drawing.
- **Decoration** unless it has a `label`: then it is an image with that name for a screen reader.

## Rules

- The drawing is lenzi's: never redraw it or change its proportions. It is traced from the PNG layers
  (`cat-art.ts` is generated data; the files in `svg/` are the same drawings, black on white, as lenzi drew them).
- A cat that is a lamp is a lamp like any other: few of them on a page (RULES.md, Light).
- Shadows and the lamps' light fall only on lit surfaces (`lenziLit`, a floor with `lenzi-lit-under`).

## API

| Input | Type | Default |
| --- | --- | --- |
| `expression` | `'happy' \| 'sleepy' \| 'sad' \| 'watching' \| 'none'` | `'happy'` |
| `back` | `'plain' \| 'hard-hat'` | `'plain'` |
| `material` | `'plain' \| 'glass' \| 'lamp' \| 'solid'` | `'plain'` |
| `size` | number, px | `96` |
| `animated` | boolean | `true` |
| `label` | string | `''` (decoration) |
| `glowColor` | a CSS colour or a variable's name | `'--mat-sys-primary'` |
| `glowStrength` | 0 to 2 | `1` |
| `glowReach` | px | `220` |

Variables: `--lenzi-cat-fill` (the plain and solid body), `--lenzi-cat-ink` (its lines).

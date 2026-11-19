# The cat

lenzi's cat (2026-11-14, "gatto_icona": "prendi i png che stanno qua, trasformali in svg e fammi una pagina
dove posso vedere gli effetti dei materiali sulle varie icone. Se riesci animalo un pochetto"): the drawing,
traced into vectors, in the theme's colours.

## What

- **An expression over a back** (lenzi, 2026-11-14: "make me choose what expression and what back to use"):
  `expression` is `happy`, `sleepy`, `sad`, `watching` or `none` (seen from behind); `back` is `plain` or
  `hard-hat` (something being built). Any expression goes over either back.
- **Petted** (`pettable`; lenzi, 2026-11-14: "i want it to be awake and happy, when you pet him, animate his
  eyes closing"): a stroke of the pointer over it closes its eyes into a U ("una specie di U": the lid comes
  down onto the eye's lower stroke) and opens its mouth (a V under the ω: "aggiungendo una v tra il 3");
  they stay so as long as the pointer is on it, and go back the same way when it leaves. Happy faces
  (happy, watching) open their mouth; the sad one only closes its eyes. It takes no click: the page under
  it stays usable.
- **Watching** (lenzi, 2026-11-14: "make it so that it follows the mouse cursor with the eyes a bit"): the
  happy face's open eyes turn towards the pointer, the rest of the face leaning a little the same way. No
  pupils (2026-11-14: "nu pupils wth"): the eyes are lenzi's, empty ovals. When the pointer is not on
  the page (it left the window, or a touch screen), it looks at the nearest boid of a flock on the page
  (`LenziSights`: nothing to set), or straight ahead.
- **A material shaped as the cat** (`material`): its body takes it inside its outline, not in a box.
  - `plain`: the page's surface, a little lighter than the page (`--lenzi-cat-fill`).
  - `glass`: a lit surface (`lenziLit`): the background and the lamps' light show through it. With
    `glass="liquid"` (lenzi, 2026-11-19: "metti un toggle per liquidglass") it is Liquid Glass instead
    (`lenziLiquidGlass`): clear, it bends what is behind it near the cat's own outline (a bezel a fourteenth of its
    width). Chromium only bends.
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
| `glass` | `'frosted' \| 'liquid'`: the glass of a glass cat | `'frosted'` |
| `size` | number, px | `96` |
| `animated` | boolean | `true` |
| `label` | string | `''` (decoration) |
| `glowColor` | a CSS colour or a variable's name | `'--mat-sys-primary'` |
| `glowStrength` | 0 to 2 | `1` |
| `glowReach` | px | `220` |
| `pettable` | boolean: stroked by the pointer, it closes its eyes, content | `false` |
| `drift` | degrees of hue a lamp's colour swings each way, slowly (0: it stays) | `0` |

Variables: `--lenzi-cat-fill` (the plain and solid body), `--lenzi-cat-ink` (its lines).

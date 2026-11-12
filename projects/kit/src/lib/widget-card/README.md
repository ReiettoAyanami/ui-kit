# Widget card

`<lenzi-widget-card>`: the card of a chart (substance-tracker's widget, from lenzi's reference photo,
2026-10-02): almost black on the anthracite page, very round corners, an icon in a round well at its head and
a large title; when its chart can be read in several intervals, a toggle of them above it.

## Rules

- **Almost black** (`surface-container-lowest`), **24 px corners**, the 2 px outline of every card.
- **An icon in a round well** from what it measures: quantities `inventory_2`, counts `numbers`, money
  `payments`, prices `sell`, hours `schedule`.
- **Each card its own interval toggle** (lenzi, 2026-10-01: "ogni card suo toggle"): drawn at once, saved by
  the page; if saving fails, back to the one it had.
- **A share of the whole period** (donut, treemap) has no toggle and says "share of the period".
- It loads nothing itself: the page asks and saves; while loading, "…" inside it, a failure "Could not load
  the chart (500)".

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `title` | `string` | required |
| input | `icon` | `string \| null` | `null` |
| input | `subtitle` | `string \| null` | `null` |
| input | `scales` | `string[]` | `[]` (a toggle from two) |
| input | `scale` | `string \| null` | `null` |
| output | `scaleChange` | `string` | |

## Variables

`--lenzi-widget-radius`.

## Origin

substance-tracker `ui/widget` (its card; the loading and saving stay in the app).

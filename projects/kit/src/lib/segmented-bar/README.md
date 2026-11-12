# Segmented bar

`<lenzi-segmented-bar>`: a bar split in segments, the whole track the maximum, each segment as wide as its
value, in its identity colour (substance-tracker's stock bar: one segment per batch).

## Rules

- **The whole track is the maximum**; the part not covered by segments is what is gone.
- **A thin separator** between two segments (2 px, the track's colour), **a least width** so a tiny one does
  not vanish (6 px).
- **Hovering a segment** (a long press on touch) shows its name and a detail (a price), just above the pointer
  and **following it**; a long press never opens what is around it.
- **Given `only`**, it draws that segment alone, out of its own whole: the others shrink away and it grows
  to its share, animated (300 ms, standard easing; none with reduced motion).
- **Selectable**: a tap on a segment (or just above or below it) says which and goes no further; from the
  keyboard each segment is a button.
- A swipe that starts on the bar still scrolls the page.
- **It computes nothing**: the numbers are the API's.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `segments` | `LenziSegment[]` (`{ id, value, color?, label?, detail? }`) | required |
| input | `max` | `number \| string` | required |
| input | `label` | `string` | `''` (what a screen reader hears) |
| input | `only` | `LenziOnlySegment \| null` (`{ id, value, max }`) | `null` |
| input | `selectable` | `boolean` | `false` |
| input | `colorOffset` | `number` | `0` |
| input | `unnamed` | `string` | `'Unnamed'` |
| output | `segmentSelect` | `number \| string` | |

## Variables

`--lenzi-segment-height`, `--lenzi-segment-min`, `--lenzi-segment-gap`, `--lenzi-standard-duration`, `--lenzi-standard-easing`.

## Origin

substance-tracker `ui/stock-bar` and `ui/batch-bar` (merged).

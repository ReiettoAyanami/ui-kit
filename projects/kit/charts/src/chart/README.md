# Chart

`<lenzi-chart>` (`@lenzi/ui-kit/charts`): the only component that knows the chart library (Apache ECharts).
Lines in, a chart out: bars, stacked bars, lines, a donut or a treemap of the totals, a radar; drawn in SVG,
in the theme's colours, each line in its identity colour.

## Rules

- **Bars with rounded ends** (6 px); stacked, only the outer pieces rounded. Stack only amounts that add up
  (money, counts, quantities of one unit): `stacked-bar`.
- **Soft lines**, 2.5 px, that never dip under zero between two points.
- **No axis lines or ticks**, a faint horizontal grid, the labels inside the chart.
- **The period in progress** (`current`, the last usually): its bars striped, its label violet, a line's
  stretch into it dashed (lenzi, 2026-10-02: "Si tratteggio"). None for the hours of the day.
- **Donut and treemap** are shares of the whole period: the totals, the empty ones left out; slices and tiles
  rounded, separated by the card's colour.
- **Radar**: the periods clockwise from the top like a clock, one scale for every spoke.
- **Chips above it hide lines by hand** (with more than one line).
- **Tooltips in dark glass**, names as text (never markup).
- **A little slower than ECharts' default** (lenzi, 2026-10-02: "poco più lente"): drawn in 600 ms, redrawn in 500.
- **It computes nothing**: every number is the page's (the API's).

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `data` | `LenziChartData` (`{ periods, current?, lines }`) | required |
| input | `type` | `'bar' \| 'stacked-bar' \| 'line' \| 'donut' \| 'treemap' \| 'radar'` | `'bar'` |
| input | `format` | `(value: number) => string` | a number, up to 3 decimals |
| input | `filters` | `boolean` | `true` |
| input | `height` | `string` | `'260px'` |
| input | `emptyText` | `string` | `'Nothing in the period'` |

`LenziChartLine`: `{ key, name, color?, values, total? }`. `lenziPeriodAxisLabel('2026-09-29')` → "29 Sept".

## Origin

substance-tracker `ui/chart` and `chart-options.ts` (the API's series replaced by plain lines).

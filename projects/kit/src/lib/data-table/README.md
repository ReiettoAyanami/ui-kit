# Data table

`<kit-data-table>`: rows of figures, one per entity, its name fixed at the left with its identity dot, one
column per figure. The header and the names stay in place while it scrolls sideways inside its own box, never
the page.

## Rules

- **Names bold at the left**, cut when long (the whole name is on its page); details under the name, one
  fact per line.
- **Numbers at the right**, digits in columns; text columns at the left.
- **It scrolls inside its own box**, rounded, with the border of every surface; the sticky parts stay under a
  window opened over the page.
- **A tap on a header orders by it**; the page keeps the order (the URL, a signal) and gives it back. A cell
  with no value goes last in either direction.
- **A tap on a row opens it** (Enter too).
- **Names are compared like people read them**: case and accents aside.
- **The cells come formatted by the page** (`format`): the API's numbers, the app's currency and units.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `nameHeader` | `string` | required |
| input | `label` | `string` | required (for a screen reader) |
| input | `columns` | `KitTableColumn[]` (`{ key, label, description?, text? }`) | required |
| input | `rows` | `KitTableRow[]` (`{ id, name, details?, color?, sortKey?, values, label? }`) | required |
| input | `sort` / `direction` | `string` / `'asc' \| 'desc' \| ''` | `''` |
| input | `format` | `KitCellFormat` | the value as it is, "—" for none |
| input | `locale` | `string` | `'en-GB'` |
| output | `sortChange` | `Sort` | |
| output | `opened` | `KitTableRow` | |

## Origin

substance-tracker `ui/metrics-table`.

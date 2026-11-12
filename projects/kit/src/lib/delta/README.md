# Delta

`<lenzi-delta>`: a change from the one before, as text: "delta: -33.3%", the word dim, the change in the colour
of where it went, after Material's triangle (lenzi, 2026-10-09: "the delta could be green if it's negative and
red if it's positive"; "an arrow up if it's positive and a triangle down if negative").

## Rules

- **The ratio is the API's** ("-0.3333" is -33.3%): the page never computes a change.
- **By default it reads normally** (lenzi, 2026-11-12): a rise is green, a fall red. **Which way is good
  is the page's to say** (`good`): where a fall is good (spending, substance-tracker) `good="down"`;
  neither: `good="none"`, no colours.
- **It is a little application-specific** (lenzi, 2026-11-12): kept in the kit because two apps show
  changes this way; its words and its sense of "good" come from the page.
- **Green and red are the status colours** (`--lenzi-status-good`, `--lenzi-status-bad`), the only colours with a
  meaning.
- **No change ("0%") and no change to show ("—")** are neither colour nor direction; "—" says why in its
  tooltip.
- **The direction is the sign shown**: -0.04%, shown "0%", is neither.
- **Nothing at all** for the first item (nothing before it): the page does not render it.
- One decimal at most, the sign always shown.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `ratio` | `string \| number \| null` | required (null: "—") |
| input | `label` | `string` | `'delta:'` |
| input | `good` | `'up' \| 'down' \| 'none'` | `'up'` |
| input | `noneReason` | `string \| null` | `null` |
| input | `locale` | `string` | `'en-GB'` |

## Example

```html
@if (consumption.deltaQuantity !== undefined) {
  <lenzi-delta [ratio]="consumption.deltaQuantity" />
}
```

## Origin

substance-tracker `ui/consumption-figures` ("delta:", 2026-10-09; before it, the delta pill).

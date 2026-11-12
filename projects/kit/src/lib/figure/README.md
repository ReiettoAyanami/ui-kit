# Figure

`<kit-figure>`: one figure, what it is on top, bold, and its value under it (lenzi, 2026-10-02: "Voglio cos'è
sopra e il valore sotto"). `<kit-figure-grid>`: several, one per line on a phone, two columns from 600 px.

## Rules

- **Name on top, bold** (`on-surface-variant`); **value under it** (body-large, 500, digits in columns).
- **Never two figures on one line joined by "·"**: each its own figure.
- **The value comes formatted**: the server computes, the page formats (currency, unit, decimals).
- **"—" when there is no value** (a price with nothing bought).
- A sentence that explains it goes under it (`description`), smaller.
- Something richer than text (a `KitDelta`) goes inside it.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `label` | `string` | required |
| input | `value` | `string \| number \| null \| undefined` | `undefined` ("—") |
| input | `description` | `string \| null` | `null` |

## Example

```html
<kit-figure-grid>
  <kit-figure label="Stock" [value]="stock()" />
  <kit-figure label="Last price"><kit-delta [ratio]="delta()" /></kit-figure>
</kit-figure-grid>
```

## Origin

substance-tracker's metrics panel (`dl` / `dt` / `dd`), 2026-10-02.

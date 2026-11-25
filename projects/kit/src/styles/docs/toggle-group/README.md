# Toggle groups

Material's `mat-button-toggle-group`, drawn by the kit as a row of low pills: 32 px high, round ends, a
little more room at each side of a label.

## When to use

- Two to four choices shown side by side, one chosen: "last | average", "quantity | value", "day | week |
  month" (a chart's interval).

## When not to use

- One pill that switches what a figure beside it shows: `LenziPillToggle`.
- Many choices, or long ones: a select.

## Rules

- **32 px high** (`--lenzi-toggle-height`; lenzi, 2026-09-30: 48 was "ciccio in altezza", then 36, then 32).
- **14 px at each side of a label** (`--lenzi-toggle-padding`): lower, not narrower.
- **Less tall never means less round** (lenzi: "il raggio di bordo era godevole").
- **Whole words**: "average", never "avg" (lenzi, 2026-09-30).
- No check mark on the chosen one: `hideSingleSelectionIndicator`.
- Its border is 1 px, like every border (2026-11-25: halved).
- What it chooses is remembered in the browser when it is a display preference (`writePreference`), never
  in the database.

## Example

```html
<mat-button-toggle-group hideSingleSelectionIndicator aria-label="Price shown" [(value)]="shown">
  <mat-button-toggle value="last">last</mat-button-toggle>
  <mat-button-toggle value="average">average</mat-button-toggle>
</mat-button-toggle-group>
```

## Origin

substance-tracker `styles.css`, "The toggles" (2026-09-30).

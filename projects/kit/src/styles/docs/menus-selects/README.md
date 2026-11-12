# Menus and selects

Material's menus, selects, autocomplete and pickers, drawn by the kit as rounded glass panels a few px away
from their field, the chosen option a pill inside them.

## Rules

- **Rounded on every side, 12 px** (`--lenzi-panel-radius`), 4 px away from their field (lenzi, 2026-10-02:
  "la scelta nelle metrics non ha border radius").
- **The chosen, hovered or focused option is a pill** 6 px in from the panel's sides (`--lenzi-option-radius`).
- **Glass** like every panel over the page; they **rise 8 px** when they open.
- **Options that need explaining** have their description under their name: `panelClass="lenzi-described-options"`,
  each option a `.lenzi-option-label` and a `.lenzi-option-description`.
- **Same names** are listed one by one, keyed by id: two entries with the same name stay two entries.

## Example

```html
<mat-form-field appearance="outline">
  <mat-label>Period</mat-label>
  <mat-select [(value)]="days">
    <mat-option [value]="30">Last 30 days</mat-option>
  </mat-select>
</mat-form-field>
```

## Origin

substance-tracker `styles.css` (2026-10-02); the described options from its "Add a metric".

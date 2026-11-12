# Expansion panels

Material's expansion panels, with the border of every surface; flat inside a window; on a phone their header
keeps only its title.

## Rules

- **A panel of a page has a border** (2 px, `outline-variant`) and Material's rounded shape.
- **Inside a window it is flat** (`class="lenzi-flat"`): no card of its own, its title and content in line
  with the text around it (lenzi, 2026-10-01: "Metrics" aligned with what is above it).
- **On a phone (under 600 px) the header keeps only its title** (lenzi, 2026-10-03: "su mobile non mostrino
  le informazioni dei toggle"): the description (a period, totals, active filters) is inside once opened.
- **Closed by default**, unless the page says otherwise (substance-tracker: filters closed, a substance's
  panels open).

## Example

```html
<mat-expansion-panel class="lenzi-flat">
  <mat-expansion-panel-header>
    <mat-panel-title>Metrics</mat-panel-title>
    <mat-panel-description>Last 30 days</mat-panel-description>
  </mat-expansion-panel-header>
  …
</mat-expansion-panel>
```

## Origin

substance-tracker `styles.css` (2026-10-01, 2026-10-03).

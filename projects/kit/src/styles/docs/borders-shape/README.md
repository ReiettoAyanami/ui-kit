# Borders and shape

Every border is 1 px (lenzi, 2026-11-25: "dappertutto il 50%"; it was 2 px); every surface above the page has one.

## Rules

- **1 px on every border** (`--lenzi-border`), Material's (cards, outlined buttons, chips, text fields, toggle
  groups) and ours (tables, sub-cards, tooltips, panels): lenzi, 2026-11-25, "in generale dovrebbero essere
  dappertutto il 50% di quello che sono ora, tante outline sono troppo spesse". It was 2 px from 2026-10-02 ("i bordi
  agli angoli non hanno lo stesso spessore dei lati"): at 100% scale a 1 px border is a little fainter along a curve.
- **A focused field, and a focus ring: 2 px** (`--lenzi-border-focus`; 3 px until 2026-11-25).
- **Straight dividers 1 px**.
- **Every surface that rises above the page has a border** in `outline-variant`: cards, expansion panels,
  dialogs, page windows, the drawer. A flat panel (`lenzi-flat`) has none.
- **Radii**: bars and the drawer 16 px (`--lenzi-bar-radius`), menus, selects and tables 12 px
  (`--lenzi-panel-radius`), a chosen option 8 px (`--lenzi-option-radius`), standalone cards and dialogs 28 px
  (`--lenzi-card-radius`), chart cards 24 px (`--lenzi-widget-radius`).
- **Floating gap**: the top bar and the drawer stand 8 px from the screen's edges (`--lenzi-float-gap`).

## Example

```css
.sub-card {
  border: var(--lenzi-border) solid var(--mat-sys-outline-variant);
  border-radius: var(--lenzi-panel-radius);
}
```

## Origin

substance-tracker `styles.css`, "Borders" (2026-10-02); the Windows-10 reveal light tried and removed the
same evening, the grain tried and removed the next day.

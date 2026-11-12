# Borders and shape

Every rounded border is 2 px, so a corner is as thick as its sides; every surface above the page has one.

## Rules

- **2 px on every rounded border** (`--kit-border`), Material's (cards, outlined buttons, chips, text
  fields, toggle groups) and ours (tables, sub-cards, tooltips, panels). lenzi, 2026-10-02: "i bordi agli
  angoli non hanno lo stesso spessore dei lati DA NESSUNA PARTE". At 100% scale a 1 px border is smeared at
  half strength along a curve; 2 px keeps a whole pixel. 1.5 px is no way out: Chrome rounds borders down.
- **A focused field: 3 px** (`--kit-border-focus`).
- **Straight dividers stay 1 px**: they have no corners.
- **Every surface that rises above the page has a border** in `outline-variant`: cards, expansion panels,
  dialogs, page windows, the drawer. A flat panel (`kit-flat`) has none.
- **Radii**: bars and the drawer 16 px (`--kit-bar-radius`), menus, selects and tables 12 px
  (`--kit-panel-radius`), a chosen option 8 px (`--kit-option-radius`), standalone cards and dialogs 28 px
  (`--kit-card-radius`), chart cards 24 px (`--kit-widget-radius`).
- **Floating gap**: the top bar and the drawer stand 8 px from the screen's edges (`--kit-float-gap`).

## Example

```css
.sub-card {
  border: var(--kit-border) solid var(--mat-sys-outline-variant);
  border-radius: var(--kit-panel-radius);
}
```

## Origin

substance-tracker `styles.css`, "Borders" (2026-10-02); the Windows-10 reveal light tried and removed the
same evening, the grain tried and removed the next day.

# Glass and motion

Windows, menus and bars are see-through and blur what is under them; they rise into place and never grow.
All of it is global (`styles/global.css`): an app gets it by using Material's dialogs, menus, selects,
pickers, snackbars, tooltips and the kit's shell.

## Rules

- **Glass** (lenzi, 2026-10-01: "un po' di trasparenza nelle finestre", like Android 17): windows keep
  `--lenzi-glass` (56%) of their colour, the top bar and the snackbar `--lenzi-glass-bar` (66%); blur 24 px,
  saturation 160%. Lowered twice by lenzi (72%, 64%, then 56%).
- **Glass**: dialogs, page windows, the drawer, menus, selects, autocomplete, pickers, snackbars, tooltips,
  the top bar. **Solid**: cards, tables, panels of a page, info bars.
- **Scrims blur the page** behind a window (6 px).
- **Reduce transparency** (LenziAppearance, or `prefers-reduced-transparency`) makes everything solid.
- **Windows never grow** (lenzi, 2026-10-02: "sembra che lagga"): full size from the first frame, their
  content fades in (250 ms), they fade out closing (150 ms).
- **They rise into place**: 24 px in 300 ms, emphasized decelerate; menus, selects and pickers 8 px; the
  snackbar 24 px.
- **The blur is whole from the first frame**: the glass never fades in; the scrims grow their tint and
  blur.
- **A window waits for its content** (at most 400 ms): put `lenzi-not-ready` on what it waits for, remove
  it when ready.
- **A lighter window** (details): `panelClass: 'lenzi-dialog-raised'`.
- **None of the motion with reduced motion.**

## Variables

`--lenzi-glass`, `--lenzi-glass-bar`, `--lenzi-glass-blur`, `--lenzi-glass-saturate`, `--lenzi-scrim-blur`,
`--lenzi-scrim-opacity`, `--lenzi-window-rise`, `--lenzi-panel-rise`, `--lenzi-rise-duration`, `--lenzi-rise-easing`,
`--lenzi-window-exit`, `--lenzi-scrim-duration`. Derived: `--lenzi-glass-filter`, `--lenzi-scrim-filter`,
`--lenzi-window-in` (the rise animation for a page window of your own).

## Origin

substance-tracker `styles.css`, "Glass" and "The opening" (2026-10-01 → 10-03).

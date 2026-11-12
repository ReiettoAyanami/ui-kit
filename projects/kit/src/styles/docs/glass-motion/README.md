# Glass and motion

Windows, menus and bars are see-through and blur what is under them; they rise into place and never grow.
All of it is global (`styles/global.css`): an app gets it by using Material's dialogs, menus, selects,
pickers, snackbars, tooltips and the kit's shell.

## Rules

- **Glass** (lenzi, 2026-10-01: "un po' di trasparenza nelle finestre", like Android 17): windows keep
  `--kit-glass` (56%) of their colour, the top bar and the snackbar `--kit-glass-bar` (66%); blur 24 px,
  saturation 160%. Lowered twice by lenzi (72%, 64%, then 56%).
- **Glass**: dialogs, page windows, the drawer, menus, selects, autocomplete, pickers, snackbars, tooltips,
  the top bar. **Solid**: cards, tables, panels of a page, info bars.
- **Scrims blur the page** behind a window (6 px).
- **Reduce transparency** (KitAppearance, or `prefers-reduced-transparency`) makes everything solid.
- **Windows never grow** (lenzi, 2026-10-02: "sembra che lagga"): full size from the first frame, their
  content fades in (250 ms), they fade out closing (150 ms).
- **They rise into place**: 24 px in 300 ms, emphasized decelerate; menus, selects and pickers 8 px; the
  snackbar 24 px.
- **The blur is whole from the first frame**: the glass never fades in; the scrims grow their tint and
  blur.
- **A window waits for its content** (at most 400 ms): put `kit-not-ready` on what it waits for, remove
  it when ready.
- **A lighter window** (details): `panelClass: 'kit-dialog-raised'`.
- **None of the motion with reduced motion.**

## Variables

`--kit-glass`, `--kit-glass-bar`, `--kit-glass-blur`, `--kit-glass-saturate`, `--kit-scrim-blur`,
`--kit-scrim-opacity`, `--kit-window-rise`, `--kit-panel-rise`, `--kit-rise-duration`, `--kit-rise-easing`,
`--kit-window-exit`, `--kit-scrim-duration`. Derived: `--kit-glass-filter`, `--kit-scrim-filter`,
`--kit-window-in` (the rise animation for a page window of your own).

## Origin

substance-tracker `styles.css`, "Glass" and "The opening" (2026-10-01 → 10-03).

# Theme and typography

The kit's Material 3 theme: dark only, violet accents on neutral greys, one font. It is the first thing an
app takes: `styles/kit.scss` (the theme, the global variables, the global rules) and `styles/fonts.css`
(Roboto Mono and Material Icons, bundled).

## Rules

- **Dark only** (lenzi, 2026-10-02): `color-scheme: dark`; the system's light setting is not followed.
- **Violet accents** (Material's violet palette), **cyan tertiary**; **neutral grey surfaces**, not the
  palette's violet-tinted ones: the page `#1f1f22`, the chart cards `#121214`, windows and menus lighter.
- **Status colours** (`--lenzi-status-good`, `--lenzi-status-bad`) are the only colours with a meaning.
- **One font: Roboto Mono** (lenzi, 2026-10-02: "Usa roboto mono per tutto"). **Bold (700)** for display,
  headline, title and label styles; values regular. Material's sizes.
- **Colours and type always through variables**: `var(--mat-sys-primary)`, `font: var(--mat-sys-title-medium)`.

## Use

```json
// angular.json, the app's "styles", in this order
"node_modules/@lenzi/ui-kit/styles/kit.scss",
"node_modules/@lenzi/ui-kit/styles/fonts.css",
"src/styles.css"
```

The neutral surfaces and the status colours are global variables (catalog, Variables page). The accent
palette is in `styles/_theme.scss` (`mat.$violet-palette`): changing it is a change of the kit.

## Roles in use

| Role | Where |
| --- | --- |
| `surface` | the page, dialogs |
| `surface-container-lowest` | chart cards |
| `surface-container-low` | standalone cards, panels of a page |
| `surface-container` / `-high` | menus, selects; tooltips, lighter windows |
| `surface-container-highest` | tracks, neutral bars |
| `on-surface` / `on-surface-variant` | text and values / labels and details |
| `outline` | notes (body-small) |
| `outline-variant` | every border, the charts' grid |
| `primary` | accents, the period in progress, links |
| `secondary-container` | the chosen side of a toggle, a pill toggle |
| `tertiary-container` | a bar that must not be forgotten ("Viewing as") |

## Origin

substance-tracker `material-theme.scss` (identical in vtiger-reader), 2026-10-02.

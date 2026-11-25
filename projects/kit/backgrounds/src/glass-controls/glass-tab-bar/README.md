# Glass tab bar

`<lenzi-glass-tab-bar>`: the navigation as Apple's tab bar, an alternative to the drawer (`@lenzi/ui-kit/backgrounds`).

## Rules

- **Capsules of glass floating at the bottom** (Apple, HIG Tab bars: "A tab bar floats above content at the bottom of
  the screen. Its items rest on a Liquid Glass background"; lenzi, 2026-11-25: "una barra orizzontale (magari da usare
  su mobile invece che su web, ma in realtà anche su web deve funzionare e può essere un'alternativa) ... come il
  selettore che abbiamo creato prima").
- **A tab per page**, its icon and its name: on a phone the icon over the name and the bar as wide as the screen;
  wider, the icon beside the name and the bar as wide as its tabs, in the middle.
- **The current page on a capsule**, its icon and name in the accent; when the page changes the capsule slides there as
  Liquid Glass (the fill to 10%, larger, bending the tabs) and settles; also on a child route.
- **The rest** (Settings, Admin, Sign out) in a capsule of its own at the end, as Apple keeps search apart.
- **Upright on the left on a computer** (lenzi, 2026-11-25: "mettimela anche su pc al posto di quella che abbiamo adesso
  ma in verticale a sinistra"; visionOS's tab bar is "always vertical, floating ... fixed relative to the window's
  leading side"): in a shell with `navigation="bar"`, wider than a phone, a slim column (56 px; lenzi: "meno tozza")
  floating in the middle of the screen's height: round tabs, icons only, the name in a tooltip on the right (and for a
  screen reader), the round capsule sliding up and down, the rest under it, 4 px round and between everything; the
  page starts after it. `orientation` (`'auto'`, `'horizontal'`, `'vertical'`) forces one way.
- **Pages only, no actions** ("Use a tab bar to support navigation, not to provide actions"), **a word each**, **five
  at most** (more scroll inside the capsule), never hidden or disabled.

## API

| | Name | Type | Default | |
| --- | --- | --- | --- | --- |
| input | `pages` | `LenziNavEntry[]` | required | a tab each |
| input | `bottom` | `LenziNavEntry[]` | `[]` | apart, at the end |
| input | `label` | `string` | `'Pages'` | the navigation's accessible name |
| input | `orientation` | `'auto' \| 'horizontal' \| 'vertical'` | `'auto'` | auto: upright when the shell says so |
| output | `navigated` | `LenziNavEntry` | | a link was tapped |
| output | `pressed` | `string` | | a button entry's id |

The entries are `LenziNavList`'s (`LenziNavEntry`). Height: `--lenzi-tab-bar-height` (60 px on a phone, 52 px wider); upright, its width: `--lenzi-tab-rail-width` (56 px) and its gap `--lenzi-tab-rail-gap` (4 px).

## Example

```html
<lenzi-app-shell navigation="bar">
  <lenzi-nav-list lenziShellNav appName="Shifts" [pages]="pages" [bottom]="bottom" />
  <lenzi-glass-tab-bar lenziShellTabs [pages]="pages" [bottom]="bottom" />
  <router-outlet />
</lenzi-app-shell>
```

## Variables

`--lenzi-tab-bar-height`, `--lenzi-glass-pill` (the current page's capsule), `--lenzi-glass`, `--lenzi-glass-filter`,
`--lenzi-liquid-tint`; the capsules are Liquid Glass of their own (`BAR_GLASS`: a squircle bezel, the default optics;
lenzi, 2026-11-25: "non è liquidglass, solo di nome"), whatever the app; the current page's capsule `LENS_SETTINGS`,
`LENS_BENDING`.

## Origin

New in the kit, 2026-11-25, after Apple's tab bar (iOS 26) and the drawer it stands in for.

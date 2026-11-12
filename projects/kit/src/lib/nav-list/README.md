# Navigation list

`<kit-nav-list>`: the drawer's content. The app's name at the top (and under it who is signed in), one link
per page with its icon, the current one highlighted; at the bottom, apart from the pages, the rest
(settings, sign out).

## Rules

- **Links only, no data** in the drawer.
- **The current page is highlighted** also on its child routes (a substance's page highlights
  "Substances"); the start page (`/`) only on itself.
- **Entries 6 px apart** (lenzi, 2026-10-03: "distanzia leggermente di più i bottoni nel menu laterale in
  altezza"); their names bold.
- **The app's name a little bigger** than the entries (title-large).
- **A tap on a link closes the drawer** (inside `KitAppShell`, by itself).
- **Sign out asks first** (lenzi, 2026-10-03: "sign out ha bisogno di una richiesta di conferma"): a button
  entry, `(pressed)` opens a `KitConfirmDialog`.

## API

| | Name | Type | Default | |
| --- | --- | --- | --- | --- |
| input | `appName` | `string` | required | |
| input | `subtitle` | `string \| null` | `null` | who is signed in |
| input | `pages` | `KitNavEntry[]` | required | |
| input | `bottom` | `KitNavEntry[]` | `[]` | settings, sign out |
| input | `label` | `string` | `'Pages'` | the navigation's accessible name |
| output | `navigated` | `KitNavEntry` | | a link was tapped |
| output | `pressed` | `string` | | a button entry's id |

`KitNavEntry`: `{ label, icon, link?, exact?, id? }`. With a `link` it is a link; without, a button.

## Example

```ts
pages: KitNavEntry[] = [
  { label: 'Consumptions', icon: 'history', link: '/' },
  { label: 'Substances', icon: 'inventory_2', link: '/substances' },
];
bottom: KitNavEntry[] = [
  { label: 'Sign out', icon: 'logout', id: 'sign-out' },
  { label: 'Settings', icon: 'settings', link: '/settings' },
];
```

## Origin

substance-tracker and vtiger-reader `sidebar` (the pages were written in each; now they come in).

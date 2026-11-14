# App shell

`<lenzi-app-shell>`: the frame of every app. A top bar that floats away from the screen's edges and sticks
while the page scrolls under its glass, with the menu button and the current route's title; a navigation
drawer that opens from it on every screen; and the page.

## When to use

- Once, in `app.html`, around the router outlet.

## Rules

- **A drawer on every screen**, opened from the menu button, closed after a tap on a link (lenzi,
  2026-10-02: "la barra di fianco si apra con un tasto come la versione android"). 240 px wide, floating
  8 px from the edges, 16 px corners, glass, its border all around.
- **The top bar** floats 8 px from the edges, 16 px corners, sticky, glass (lenzi, 2026-10-02: "la barra
  in cima deve avere bordi arrotondati in entrambe le versioni"). Its title is the deepest route's `title`.
- **Scrolled past its height, the bar closes from the right onto its menu button** (lenzi, 2026-11-14:
  "dovrebbe compattarsi con un animazione verso l'icona di apertura/chiusura, non mostrando il titolo della
  pagina", "the top bar should slide in from right to left and close on the icon"): as wide as it is high.
  The title stays put and the moving edge covers it, and reveals it opening ("the text should reveal as the
  bar closes/open"). Back to whole above it. Its height never changes, so the page does not move.
- **A page's search bar goes into the closed bar** ("if there's a search bar make it slide there ... and
  incorporate it into the top bar", "make the search bar slide with the top bar to the right of the icon"):
  `lenziShellSearch` on it. The bar stops where the search bar ends; the search bar rides in on the closing
  edge (its right end on it, same time, same curve) and stays just after the button, inside the bar's glass.
- **The document scrolls, not the shell**, so a page window can stop it scrolling under itself.
- **Opened, the drawer focuses the current page's entry**, not the first one (lenzi, 2026-10-03).
- **Edge to edge** (Android): the shell keeps its bars inside the safe-area insets.
- A sign-in page stands alone: route `data: { bare: true }` (or `[bare]`).

## Slots

| Attribute | Where | For |
| --- | --- | --- |
| `lenziShellNav` | the drawer | a `LenziNavList` |
| `lenziShellActions` | the end of the top bar | a `LenziNotificationBell`, an icon button |
| `lenziShellBanner` | a bar above the top bar, sticky | "Viewing as" (`LenziInfoBar`, tone tertiary) |
| `lenziShellBelow` | under the top bar | "Offline", "A new version" (`LenziInfoBar`), `LenziPullToRefresh` |
| (none) | the page | `<router-outlet />` |

## API

| | Name | Type | Default | |
| --- | --- | --- | --- | --- |
| input | `title` | `string \| null` | `null` | null: the deepest route's title |
| input | `bare` | `boolean \| 'route'` | `'route'` | the page alone: `'route'` follows route data `bare: true`; `true` / `false` always / never |
| input | `menuLabel` | `string` | `'Menu'` | the menu button's accessible name |
| method | `openNav(click?)` / `closeNav()` | | | `LenziNavList` closes it after a link |
| signal | `compact` | `boolean` | | scrolled past the bar: it has shrunk to its menu button |
| directive | `lenziShellSearch` | | | on a page's `LenziSearchBar`, a child of the page's column: it rides beside the shrunk bar |

## Example

```html
<lenzi-app-shell>
  <lenzi-nav-list lenziShellNav appName="Substance tracker" [subtitle]="user()?.username" [pages]="pages" [bottom]="bottom" />
  <lenzi-notification-bell lenziShellActions noun="tickets" [items]="news()" />
  <router-outlet />
</lenzi-app-shell>
<lenzi-version-label [version]="version()" />
```

## Variables

`--lenzi-float-gap`, `--lenzi-bar-radius`, `--lenzi-drawer-width`, `--lenzi-glass-bar`, `--lenzi-glass-filter`,
`--lenzi-search-height`, `--lenzi-standard-duration`, `--lenzi-standard-easing`.

## Origin

substance-tracker and vtiger-reader `app.html` / `app.css` / `app.ts` (the same shell, copied).

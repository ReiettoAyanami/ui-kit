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

`--lenzi-float-gap`, `--lenzi-bar-radius`, `--lenzi-drawer-width`, `--lenzi-glass-bar`, `--lenzi-glass-filter`.

## Origin

substance-tracker and vtiger-reader `app.html` / `app.css` / `app.ts` (the same shell, copied).

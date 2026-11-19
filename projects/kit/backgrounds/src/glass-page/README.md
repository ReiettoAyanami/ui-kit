# Glass page

`lenziGlassPage` and `lenziOverBackground()` (`@lenzi/ui-kit/backgrounds`): a page over a background has a glass pane
behind its elements, and its surfaces are lit (lenzi, 2026-11-17: "whenever we have a background like this, we need a
glass panel behind like in overview and components"; "wherever page we have a background cards or any elements over
the background should turn into lit elements"). Made in the catalog, moved into the kit on 2026-11-19, when an app
written from scratch with the kit had to copy its CSS. The kit knows by itself whether a background is there (lenzi,
2026-11-19): the app wires nothing.

## What

- **The kit knows when the page has a background** (`LenziBackgroundPresence`): every background of the kit behind
  the whole page (`fill="page"`) says so while it is there, the glowing ones (blobs, a flock, a scene) and a plain one
  with a picture (a photo, a gradient). A plain colour alone does not count: it is only the page's colour. One behind a
  box (`fill="box"`) does not count either.
- **The pane** (`<main lenziGlassPage>`): while there is a background, lit glass (`lenziLit`) lies behind the page's
  elements, with a panel's border and radius, and the page stands away from the screen's edges (16 px, 48 below). On a
  phone (under 600 px) the pane is the whole screen, no border, as tall as the screen without the address bar
  (`100lvh`). Without a background, nothing is added and the page keeps its own margins.
- **The surfaces** (`lenziOverBackground()`): a signal, `true` while there is a background; the page's cards and
  panels take it, `[lenziLit]="lit()"`, lit over a background and solid without.
- The pane is a layer of its own, not the elements' container: glass over it still blurs the background, and the page
  gets no layer of its own (no `z-index`), so a search bar in it still rides into the top bar (`lenziShellSearch`).

## Rules

- **One pane a page**, on the page's own element (its `<main>`), never on a card or a section.
- **Over a background, the page's own surfaces are lit; without one, solid**: cards, panels, a card's ⋮. Not what is
  inside them (code, an editor, a demo).
- The pane is decoration: screen readers do not see it, and it never takes a click.

## API

| | Name | What |
| --- | --- | --- |
| component | `[lenziGlassPage]` | on the page's `<main>`: the glass pane behind its elements, while there is a background |
| function | `lenziOverBackground()` | `Signal<boolean>` (an injection context): the page has a background behind it |
| service | `LenziBackgroundPresence` | `present` (`Signal<boolean>`), `add()`: used by the backgrounds, never by an app |

## Example

```html
<!-- app.html: the background, behind the whole page -->
<lenzi-scene [scene]="scene" />

<!-- a page -->
<main class="page" lenziGlassPage>
  <mat-card appearance="outlined" [lenziLit]="lit()">…</mat-card>
</main>
```

```ts
import { LenziGlassPage, LenziLit, lenziOverBackground } from '@lenzi/ui-kit/backgrounds';

export class HomePage {
  protected readonly lit = lenziOverBackground();
}
```

## Origin

The catalog's `GlassPage` (2026-11-17) and its `overBackground()`; the overview's glass pane (2026-11-14).

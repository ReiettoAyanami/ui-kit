# Bento grid

`<lenzi-bento>` and its tiles, `<lenzi-bento-tile>` (or `<a lenziBentoTile>`): tiles of different sizes in one grid,
the size saying how much each matters (lenzi, 2026-11-26, the catalog's overview: "vai con la a"; the bento grids of
Apple's product pages and of Atlassian Design's home).

## When to use

- A page that is a picture of several things at once: an overview, a home, a dashboard of a few panels.
- Not for a list of things of one kind (cards of components, rows of data): those are a grid of equal cards or a table.

## Rules

- **The size means something**: the largest tile is what matters most; tiles of one size are things of one weight. A
  bento where every tile is the same is a grid of cards: use one.
- **Six to nine tiles**: past that it is a wall.
- **Twelve columns** where the grid is wide (840 px of its own width and more), **six** where it is medium (520 px and
  more: a wide tile, six columns or more, takes the whole row; the others half their columns, rounded up), **one** on a phone (each tile as tall as what it holds). The grid
  measures itself, not the window.
- **Rows at least 112 px** (`--lenzi-bento-row`), taller as what a tile holds needs; `rows` makes a tile span more.
- **A tile is a panel of the page** (`.lenzi-surface`): its corners `--lenzi-widget-radius`, 20 px of padding, a border.
  In an app of Liquid Glass it is glass, its edge lit by what is under it; over a background in another app, give it
  `lenziLit`. `flat`: no panel of its own (a tile that is a picture, or holds its own panel).
- **A tile that leads somewhere is the link**: `<a lenziBentoTile routerLink="…">`, never a link inside a tile that
  looks clickable as a whole.
- Order the tiles as they should read on a phone: one column keeps their order (the grid fills gaps on a wide screen).

## API

| | Name | Type | Default | What |
| --- | --- | --- | --- | --- |
| component | `lenzi-bento` | | | the grid; its tiles inside it |
| component | `lenzi-bento-tile`, `a[lenziBentoTile]` | | | one tile |
| input | `span` | `number` 1 to 12 | `4` | columns of twelve where the grid is wide |
| input | `rows` | `number` | `1` | rows it takes (not on a phone) |
| input | `flat` | `boolean` | `false` | no panel of its own |
| variable | `--lenzi-bento-row` | length | `112px` | the rows' least height |

## Example

```html
<lenzi-bento>
  <lenzi-bento-tile [span]="7" [rows]="2"><h1>ui-kit</h1>…</lenzi-bento-tile>
  <a lenziBentoTile [span]="5" routerLink="/scenes">Scenes</a>
  <a lenziBentoTile [span]="6" [rows]="2" routerLink="/components">Components</a>
</lenzi-bento>
```

## Origin

New in the kit (2026-11-26), for the catalog's overview.

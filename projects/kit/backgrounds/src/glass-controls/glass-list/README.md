# Glass list

`<lenzi-glass-list>`: a list of what a panel beside it shows, one chosen, under a lens of Liquid Glass that slides to the
next (`@lenzi/ui-kit/backgrounds`). The showcase's list (`LenziShowcase`), made a piece of its own (lenzi, 2026-11-26:
"Questa mettila nelle componenti e fai in modo che l'highlight della selezione sia una lente di liquid glass
bianchina/violacea").

## Rules

- **Each entry a name, bold, and a caption under it** (one line of what it is); whole words.
- **The chosen entry is under a lens of Liquid Glass, milky white and violet** (`--lenzi-glass-list-lens`: the primary
  colour, 60%, in white; 20% of it at rest). A tap on another entry, or the arrows, slide the lens there: on its way it
  is clear glass, a little larger; it settles milky. The segmented control's way (kube.io's switch), but **always under
  the words** (lenzi, 2026-11-26: "fa degli sfarfallii strani prima di arrivare": over them its bezel stretched their
  lines into streaks, new ones at every frame of the slide).
- **Only its place slides, never its size**: it takes the size of the entry it goes to at once (a glass's filter is
  made for its size: a size that moves made a new one at every frame, a frame bent by maps not drawn yet, the flicker).
- **Nothing cuts it**: a column does not scroll; a row scrolls with room round the entries for the lens grown on its
  way and the focus ring (lenzi: "si taglia", as the segmented control's capsule cut by its scroller).
- **A column, or a row** where its place says so (`--lenzi-glass-list-direction: row`; then
  `--lenzi-glass-list-captions: none`, `--lenzi-glass-list-wrap: nowrap` and `--lenzi-glass-list-overflow: auto`, the
  names alone, scrolling). A row wider than its
  place scrolls; the lens scrolls with it.
- **Tabs** for a screen reader: the chosen one in the tab order, the arrows walk them (either way, round), Home and End
  go to the ends.
- Under the chosen entry's words, what the app gives (`extra`): the showcase's clock, a count; in the entry's padding,
  so choosing another moves nothing.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `items` | `LenziGlassListItem[]` (`{ name, caption? }`) | required |
| input | `label` | `string` | required (for a screen reader) |
| model | `selected` | `number`: the chosen entry's index | `0` |
| input | `extra` | `TemplateRef<{ $implicit: number }> \| null`: under the chosen entry's words | `null` |
| method | `choose(index)` | the lens slides there | |
| const | `GLASS_LIST_LENS` | the lens's glass (`LENS_SETTINGS`, bezel 14, thickness 32, refraction 1.2) | |

## Example

```html
<lenzi-glass-list label="Examples" [items]="examples" [(selected)]="shown" />
```

## Variables

`--lenzi-glass-list-lens` (its tint), `--lenzi-glass-list-radius` (`--lenzi-panel-radius`), `--lenzi-glass-list-direction`,
`--lenzi-glass-list-captions`, `--lenzi-glass-list-wrap`; `--mat-sys-primary`, `--lenzi-border-focus`; the glass:
`GLASS_LIST_LENS`, `LENS_BENDING` (`glass-controls/lens.ts`).

## Origin

New in the kit, 2026-11-26: the list beside `LenziShowcase`'s slide, which uses it.

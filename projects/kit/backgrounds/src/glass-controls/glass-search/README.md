# Glass search

`<lenzi-glass-search>`: a search field the way Apple's is in its new design (`@lenzi/ui-kit/backgrounds`).

## Rules

- **A capsule of Liquid Glass**, a magnifier and what it looks for inside it, an ✕ that clears it (lenzi, 2026-11-25:
  "implementa ... searchbar nel kit come quelli di apple").
- **It searches as you type**, after a 300 ms pause (at once when cleared), as `LenziSearchBar` does; the page keeps the
  text (the URL) and gives it back.
- A floating control: over the content, never inside a card (Apple: Liquid Glass is the layer of controls).
- **kube.io's search box's optics**: a convex bezel, refraction 0.7, blur 1, specular 0.2 and 4.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| model | `value` | `string` | `''` |
| input | `placeholder` | `string` | required: what it searches ("Search shifts") |
| output | `search` | `string` | the text once typing paused |

## Example

```html
<lenzi-glass-search placeholder="Search shifts" [value]="query()" (search)="find($event)" />
```

## Variables

`--mat-sys-primary`, `--mat-sys-inverse-surface`, `--lenzi-border-focus`; the glass: `LENS_SETTINGS` (`glass-controls/lens.ts`:
a lip bezel, refraction 1, blur 0.2, specular 0.5 and 6), `LENS_BENDING` (0.4 at rest, 0.9 held).

## Origin

New in the kit, 2026-11-25, after Apple's controls and kube.io's demonstrations.

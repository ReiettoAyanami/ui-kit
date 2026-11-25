# AI notes: Glass search

- `import { LenziGlassSearch } from '@lenzi/ui-kit/backgrounds'`.
- Put the text in the page's URL on `(search)` and pass it back in `value`.
- One per page; on a page with a top bar, `LenziSearchBar` with `lenziShellSearch` is the kit's other way.
- Never style its glass; its height is `--lenzi-glass-search-height`.
- The thumb's glass is made by the kit (`glassLens`): never a `lenziLiquidGlass` of your own on it.

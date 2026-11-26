# AI notes: Glass list

- `import { LenziGlassList } from '@lenzi/ui-kit/backgrounds'`.
- For a few entries (2 to 8) that choose what a panel beside them shows: a showcase's slides, a page's sections. A
  navigation of the app is `LenziGlassTabBar` or `LenziNavList`; choices of a value side by side, `LenziGlassSegmented`.
- Give the entries as data (`{ name, caption }`) and keep the chosen index in the page: `[(selected)]`.
- A row where the place is narrow: set `--lenzi-glass-list-direction: row`, `--lenzi-glass-list-captions: none`,
  `--lenzi-glass-list-wrap: nowrap`, `--lenzi-glass-list-overflow: auto` on it (a container query of the place), never a second list.
- The lens's glass is made by the kit (`glassLens`): never a `lenziLiquidGlass`, a fill or a border of your own on it;
  its tint is `--lenzi-glass-list-lens`.

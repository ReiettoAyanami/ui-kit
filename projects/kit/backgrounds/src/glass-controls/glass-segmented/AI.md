# AI notes: Glass segmented control

- `import { LenziGlassSegmented } from '@lenzi/ui-kit/backgrounds'`.
- Two to five short choices of one thing (a period, a view); more, or long words: a select.
- Whole words, lowercase like the kit's toggles; give the options as data, the same values every time.
- The choice is the page's (the URL, a preference): pass it back in `value`.
- The thumb's glass is made by the kit (`glassLens`): never a `lenziLiquidGlass` of your own on it.

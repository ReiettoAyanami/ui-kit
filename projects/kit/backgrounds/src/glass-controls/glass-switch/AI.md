# AI notes: Glass switch

- `import { LenziGlassSwitch } from '@lenzi/ui-kit/backgrounds'`.
- One setting on or off, saved at once on `(checkedChange)`: never with a separate Save.
- Its name beside it is the page's text; `label` says it to a screen reader.
- Never restyle its track or thumb; a colour that changes is the accent's (`--mat-sys-primary`).
- The thumb's glass is made by the kit (`glassLens`): never a `lenziLiquidGlass` of your own on it.

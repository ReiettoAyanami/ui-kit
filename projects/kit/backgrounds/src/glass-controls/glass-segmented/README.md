# Glass segmented control

`<lenzi-glass-segmented>`: two or more choices side by side, one chosen, moving like Apple's switch (`@lenzi/ui-kit/backgrounds`).

## Rules

- **A capsule track**, each choice a whole word; **the chosen one on a light capsule**.
- **A tap on another choice moves the capsule there; a tap on the chosen one moves it to the next**, round to the first
  (lenzi, 2026-11-25: "fammi un selettore triplo con animazione simile/uguale a questo switch. Quindi quando clicchi va
  alla prossima opzione diventando vetro e tutto").
- **On its way the capsule is clear Liquid Glass**, larger, bending the words under it, and settles as milky glass
  (25% of its fill: the bending shows at rest too (lenzi, 2026-11-26: "configura gli elementi più piccoli per fare in modo che l'effetto liquidglass si veda meglio, come lo slider, toggle ecc.")).
- The arrow keys move it, round. A `radiogroup` of `radio`s.
- **Built as kube.io's switch**: the capsule is always glass under a solid fill (`--lenzi-glass-pill`); on its way
  the fill goes to 10%, it grows (1.18) and bends more.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `options` | `LenziGlassOption<T>[]` (`{ value, label }`) | required |
| model | `value` | `T \| null` | `null` (the first) |
| input | `label` | `string` | required (for a screen reader) |
| input | `disabled` | `boolean` | `false` |

Sizes: every choice as wide as the widest (at least `--lenzi-segment-min-width`, 64 px); `--lenzi-segment-height`
(28 px, 32 with its track, as every toggle of the kit). Wider than its place, it scrolls.

## Example

```html
<lenzi-glass-segmented label="Period" [options]="periods" [(value)]="period" />
```

## Variables

`--mat-sys-primary`, `--mat-sys-inverse-surface`, `--lenzi-border-focus`; the glass: `LENS_SETTINGS` (`glass-controls/lens.ts`:
a lip bezel, refraction 1, blur 0.2, specular 0.5 and 6), `LENS_BENDING` (0.4 at rest, 0.9 held).

## Origin

New in the kit, 2026-11-25, after Apple's controls and kube.io's demonstrations.

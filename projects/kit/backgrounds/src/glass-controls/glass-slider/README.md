# Glass slider

`<lenzi-glass-slider>`: a value between two ends, the way Apple's slider is (`@lenzi/ui-kit/backgrounds`).

## Rules

- **A spring** (lenzi, 2026-11-26: "anche le barre di scorrimento devono avere il comportamento a molla"): pulled past an
  end the thumb follows less and less, a rubber band (at most `SLIDER_OVERSHOOT`, 0.6, of its glass's width), the value
  at the end; let go, it springs back, a little past, then home. The glass a dome, as every pill.
- **A thin capsule rail**, the accent up to the value; **a light capsule thumb**.
- **Shapes of the page's** (lenzi, 2026-11-25: "la forma dei knob dovrebbe essere configurabile, sia quello di vetro
  nell'animazione che quello che poi è solido"): `thumb` and `lens`; and **a wavy fill** ("una barra ondulata come su
  android per la musica"): `track="wave"`, flowing unless `[waveMoving]="false"` (still with reduced motion).
- **At rest the thumb is white** (as the switch's when it arrives: lenzi, 2026-11-26, "il toggle non diventa piú bianco
  all'arrivo"), **dragged it is clear Liquid Glass**, larger, magnifying the rail under it, and settles white again,
  thicker glass than kube.io's (lenzi, 2026-11-26: "configura gli elementi più piccoli per fare in modo che l'effetto liquidglass si veda meglio, come lo slider, toggle ecc."). First made as Apple's (lenzi, 2026-11-25:
  "come quelli di apple").
- A tap on the rail jumps there; the arrow keys step, Page Up/Down ten steps, Home and End the ends; always on a step,
  inside the ends. A `role="slider"` with its ends, value and `aria-valuetext`.
- **Built as kube.io's** (read from its code): one thumb, always glass under a white fill (`--lenzi-glass-thumb`);
  dragged, the fill goes to 10% and the thumb grows from 0.6 to 1: the rail shows through it. A convex bezel,
  specular 0.4 and 7, no blur.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| model | `value` | `number` | `0` |
| input | `min`, `max`, `step` | `number` | `0`, `100`, `1` |
| input | `label` | `string` | required |
| input | `valueText` | `string \| null` | `null` (how the value reads aloud: "40 %") |
| input | `disabled` | `boolean` | `false` |
| input | `thumb` | `'capsule' \| 'circle' \| 'bar'` | `'capsule'` | the solid thumb: Apple's capsule (38 × 24), a circle (24), Android's upright bar (6 × 30) |
| input | `lens` | `'capsule' \| 'circle' \| 'bar'` | `'capsule'` | the glass thumb while dragged: 63 × 40, 44, 24 × 48 |
| input | `track` | `'line' \| 'wave'` | `'line'` | the fill as a wave, Android's music player's; the rest a line |
| input | `waveAmplitude`, `waveLength` | px | `3`, `28` | the wave's height either side and its length |
| input | `waveMoving` | `boolean` | `true` | the wave flows along (as music plays) |

## Example

```html
<lenzi-glass-slider label="Volume" [(value)]="volume" [step]="5" />
```

## Variables

`--mat-sys-primary`, `--mat-sys-inverse-surface`, `--lenzi-border-focus`; the glass: `LENS_SETTINGS` (`glass-controls/lens.ts`:
a lip bezel, refraction 1, blur 0.2, specular 0.5 and 6), `LENS_BENDING` (0.4 at rest, 0.9 held).

## Origin

New in the kit, 2026-11-25, after Apple's controls and kube.io's demonstrations.

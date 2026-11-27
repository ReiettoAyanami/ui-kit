# Glass slider

`<lenzi-glass-slider>`: a value between two ends, the way Apple's slider is (`@lenzi/ui-kit/backgrounds`).

## Rules

- **A spring** (lenzi, 2026-11-26: "anche le barre di scorrimento devono avere il comportamento a molla"): pulled past an
  end the thumb follows less and less, a rubber band (at most `SLIDER_OVERSHOOT`, 0.4, of its knob's lens), the value
  at the end; let go, it springs back, a little past, then home. The glass a dome, as every pill.
- **Its knob never goes over what is beside it**: room inside its ends for half its lens (lenzi, 2026-11-26: the glass
  over the "Volume" before it, "non so cosa succede con il testo").
- **A thin capsule rail**, the accent up to the value, **its end fading** over 12 px, never a cut, and the rest of the rail rising as softly (lenzi, 2026-11-26: "sfuma la fine della barra, nell'ultimo punto": magnified under the knob's lens it was ugly, `--lenzi-slider-fade`); **its knob a `LenziGlassKnob`** (lenzi, 2026-11-26: "rendi il
  pomello la sua entità propria"): the page's, as its content, or its own of the shapes `thumb` and `lens` ask for
  (the kit's thin capsule by default, 32 × 14, held a lens 1.35 times it: "i pomelli più fini ... la lente leggermente
  più grande del pomello"). See the knob's page.
- **Shapes of the page's** (lenzi, 2026-11-25: "la forma dei knob dovrebbe essere configurabile, sia quello di vetro
  nell'animazione che quello che poi è solido"): `thumb` and `lens`; and **a wavy fill** ("una barra ondulata come su
  android per la musica"): `track="wave"`, flowing unless `[waveMoving]="false"` (still with reduced motion).
- **At rest the thumb is white** (as the switch's when it arrives: lenzi, 2026-11-26, "il toggle non diventa piú bianco
  all'arrivo"), **dragged it is clear Liquid Glass**, larger, magnifying the rail under it, and settles white again,
  thicker glass than kube.io's (lenzi, 2026-11-26: "configura gli elementi più piccoli per fare in modo che l'effetto liquidglass si veda meglio, come lo slider, toggle ecc."). First made as Apple's (lenzi, 2026-11-25:
  "come quelli di apple").
- A tap on the rail jumps there; the arrow keys step, Page Up/Down ten steps, Home and End the ends; always on a step,
  inside the ends. A `role="slider"` with its ends, value and `aria-valuetext`.
- **Built as kube.io's** (read from its code; the knob now `LenziGlassKnob`): one thumb, glass under a white fill (`--lenzi-glass-thumb`);
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
| input | `thumb` | `LenziKnobShape` (capsule, circle, bar, a blob's) | `'capsule'` | its own knob's shape, white at rest (32 × 14, 18, 6 × 22, 24: `KNOB_SIZES`) |
| input | `lens` | `LenziKnobShape` | `'capsule'` | its own knob's glass, held (1.35 times it); a `<lenzi-glass-knob>` as its content wins over both |
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

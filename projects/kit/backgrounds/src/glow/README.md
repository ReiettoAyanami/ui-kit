# Glowing elements

`lenziGlow` and `LenziLightField` (`@lenzi/ui-kit/backgrounds`): any element turned into a lamp (lenzi,
2026-11-14: "a type of "material" that is basically a lit surface and projects light directly onto the others
component. This type of material can be used on every element we have already (such as buttons, lists, ecc) .
And i want it to be able to glow and effect the other elements. this elements must act on the same plain as
the other elements unlike the backhgorund"; and "ovviamente la luce di tutti i colori").

## What it does

- **A lamp is a lit surface too** (`lenziGlow` includes `lenziLit`): other lamps light it.
- **It glows** in its colour: its surface takes the colour, its border is the colour, a halo of its light lies
  around it. Switching it off (`[lenziGlow]="false"`) fades it out, and then it is a lit surface like the
  others.
- **It lights the lit surfaces around it, on the same plane**: each surface it reaches (`glowReach`) takes its
  light from the side that faces it, brighter the nearer it is, over its colour (`--lenzi-glow-veil`) and
  along its border (`--lenzi-glow-rim`). The light follows the elements wherever they move (scroll, layout,
  dragging).
- **Any colour, and colours add up**: a surface between a red lamp and a blue one is red on one side, blue on
  the other, and magenta where both reach. At most the six nearest lamps light a surface.
- **Nothing runs while no lamp is on**; a frame where nothing moved writes nothing. With reduced motion the
  light switches on and off at once.

## Rules

- **Lamps are few**: a lamp says "this is alive" (playing, recording, the thing you are on). A page full of
  lamps has none.
- **Only lit surfaces take the light**: put `lenziLit` on what should be lit; a solid card stays solid.
- **The colour is the lamp's meaning**: the accent by default; a status colour only for that status.
- **The text on a lamp stays readable**: its surface takes at most 45% of its colour; check the contrast on a
  light colour.
- **How much light lies on a surface is global** (the two variables, the Variables page); a lamp has its own
  colour, strength and reach.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `lenziGlow` | `boolean` (a bare attribute: on) | `true` |
| input | `glowColor` | a variable's name or a CSS colour | `'--mat-sys-primary'` |
| input | `glowStrength` | `number` 0..2 | `1` |
| input | `glowReach` | `number` px | `220` |
| service | `LenziLightField` | `addLamp`, `addSurface`, `wake`, `update`: used by `lenziGlow` and `lenziLit` | |
| variable | `--lenzi-glow-veil` | how much of a lamp's light lies over a lit surface | `70%` |
| variable | `--lenzi-glow-rim` | how much runs along its border | `100%` |

## Example

```html
<button mat-fab lenziGlow glowColor="#f4ecff" aria-label="Bulb"><mat-icon>lightbulb</mat-icon></button>
<button mat-stroked-button type="button" [lenziGlow]="playing()">Play</button>
<mat-card appearance="outlined" lenziLit>…</mat-card>
```

## Origin

New in the kit (2026-11-14).

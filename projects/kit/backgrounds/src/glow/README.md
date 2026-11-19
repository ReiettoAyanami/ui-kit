# Glowing elements

`lenziGlow`, `lenziSolid` and `LenziLightField` (`@lenzi/ui-kit/backgrounds`): any element turned into a lamp
(lenzi, 2026-11-14: "a type of "material" that is basically a lit surface and projects light directly onto the
others component. This type of material can be used on every element we have already (such as buttons, lists,
ecc) . And i want it to be able to glow and effect the other elements. this elements must act on the same
plain as the other elements unlike the backhgorund"; "ovviamente la luce di tutti i colori"), and solid
elements that stop the light ("a faint hard shadow ... for if a solid component is interacting with light").

## What it does

- **Three materials**: a **lamp** (`lenziGlow`: glass that gives light; other lamps light it too), **glass**
  (`lenziLit`: the light lies on it and goes through it), **solid** (`lenziSolid`: its own look, lit on the
  side facing a lamp, and it stops the light). Solid is opaque: an element see-through by itself (a toggle
  group, a list, an outlined button) takes the page's surface (`--lenzi-solid-surface` to change it).
- **A lamp glows** in its colour: its surface takes the colour, its border is the colour, a halo lies around
  it, and its light lies over what it holds (a toggle's chosen segment too). `[lenziGlow]="false"` fades it
  out; then it is glass like the others.
- **It lights the surfaces around it, on the same plane**: each surface it reaches (`glowReach`) takes its
  light centred on the lamp, fading with the distance from the lamp's outline (all round it, whatever its
  shape), over everything it holds
  (`--lenzi-glow-veil`) and along its border (`--lenzi-glow-rim`). The light follows the elements wherever
  they move (scroll, layout, dragging).
- **Any colour, and colours add up**: a surface between a red lamp and a blue one is red on one side, blue on
  the other, and magenta where both reach. At most the six nearest lights light a surface.
- **Solid elements cast a faint, hard shadow**: behind them, away from each lamp, part of that lamp's light
  (`--lenzi-shadow`) is gone from the surfaces there, from its own outline (rounded corners too). **Only on
  what lies under it** (lenzi, 2026-11-14: "The one on the bottom shouldn't be able to cast to the one on
  top"): what it holds and what is drawn over it (a higher z-index, or later at the same one) take no shadow. Drawn by a paint worklet (`paint(lenzi-light)`) where
  the browser has one (Chrome, Edge); elsewhere the light is there without shadows.
- **A floor**: a lit surface that holds the others (`lenziLit` + class `lenzi-lit-under`) takes the light
  under what it holds, so the light and the shadows fall on it. It has no blur and no blend of its own: in
  Chrome either would keep the glass on it from blurring what is under that glass (2026-11-14).
- **A blob background's blobs are lights too** (lenzi, 2026-11-14: their light "should act more like this
  on the glass surfaces"): each lights the surfaces near it in its colour, from where it is.
- **Nothing runs while no light is on**; a frame where nothing moved writes nothing. Nothing is put inside an
  element: the light is in its `::before` and `::after` (a card's own `::after`, a border for forced colours,
  gives way). With reduced motion the light switches on and off at once.

## Solid text

`.lenzi-solid-text` (lenzi, 2026-11-19: "lettere scure sul bagliore", "Le lettere devono fare ombra"): the letters are
the page's surface (`--lenzi-solid-surface`), so over a glowing background behind the page they are dark solid shapes
that block it, and each casts a hard shadow (down and right, 0.06 × 0.08 em) of the surface at `--lenzi-shadow`, which
takes that much of the glow away. On the bare page both are the page's colour: the words are not seen until something
glows behind them. Only the letters: never `lenziSolid` on a block of such text (its box would be opaque and hide the
glow).

## Rules

- **Lamps are few**: a lamp says "this is alive" (playing, recording, the thing you are on). A page full of
  lamps has none.
- **Only lit or solid elements take the light**; the rest is as it is.
- **The colour is the lamp's meaning**: the accent by default; a status colour only for that status.
- **The text on a lit element stays readable**: the light lies over it; check the contrast near a lamp.
- **How much light lies on a surface, and how dark a shadow is, is global** (the three variables, the
  Variables page); a lamp has its own colour, strength and reach.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `lenziGlow` | `boolean` (a bare attribute: on) | `true` |
| input | `glowColor` | a variable's name or a CSS colour | `'--mat-sys-primary'` |
| input | `glowStrength` | `number` 0..2 | `1` |
| input | `glowReach` | `number` px | `220` |
| directive | `lenziSolid` | a solid element: lit, casts shadows | |
| class | `lenzi-lit-under` | with `lenziLit`: a floor, lit under what it holds | |
| service | `LenziLightField` | `addLamp`, `setSourceLamps`, `addSurface`, `addCaster`, `wake`, `update`: used by the directives and the backgrounds | |
| variable | `--lenzi-glow-veil` | how much of a lamp's light lies over a surface | `70%` |
| variable | `--lenzi-glow-rim` | how much runs along its border | `100%` |
| variable | `--lenzi-shadow` | how much light a solid element's shadow takes away | `60%` |

## Example

```html
<main lenziLit class="lenzi-lit-under">
  <button mat-fab lenziGlow glowColor="#f4ecff" aria-label="Bulb"><mat-icon>lightbulb</mat-icon></button>
  <button mat-stroked-button type="button" [lenziGlow]="playing()">Play</button>
  <mat-card appearance="outlined" lenziLit>…</mat-card>
  <mat-card appearance="outlined" lenziSolid>…</mat-card>
</main>
```

## Origin

New in the kit (2026-11-14).

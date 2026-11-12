# Colour picker

`<lenzi-color-picker>`: a colour you change from the colour itself. A round swatch; a click opens the colour
selector under it (lenzi, 2026-11-12: "se mostri un colore o che, fammi cliccare sul colore e mostrare un
selector di colore").

## When to use

- Wherever a colour the user may change is shown: a shift type's colour, a label's, a variable of the look.
  The swatch **is** the way to change it: no "change colour" button beside it.

## When not to use

- A colour that only shows something (an identity dot, a chart's key): `LenziIdentityDot`, never a picker
  that cannot be used.
- A choice among a few fixed colours and nothing else: a toggle group or a select with a dot per option.

## Rules

- **The swatch is round**, with the 2 px border of every rounded thing; 32 px by default, and 48 px to tap
  however small it is drawn.
- **The selector is a glass panel like a menu's**: rounded on every side, a few px away from its swatch,
  rising into place; above the swatch when there is no room under it, never out of the screen.
- **In it, from the top**: the shade (saturation from left to right, brightness from bottom to top), the hue,
  the hex, a pick from the screen where the browser has one (Chromium), then the colours the app offers.
- **The colour follows the selector at once** (`[(value)]`): what it colours changes while the thumb moves.
  **`picked` says the final colour** when the selector closes, if it changed: that is the moment to save.
- **There is always a way back** (lenzi, 2026-11-12: "Need a way to go back and put a snackbar asking sum
  like "U sure?" because now i changed a color without a wai to go back"). In the selector, the ↶ button
  goes back to the colour it opened with. When it closes with another colour, a snackbar asks "… is now
  #rrggbb. Keep it?" for 8 seconds: **Go back** brings the colour before (and `picked` says it), doing
  nothing keeps the new one.
- **It closes** on a click outside, on Escape, on the swatch again; the focus goes back to the swatch.
- **Keyboard**: the focus starts on the shade; arrows move it by 1% (the hue by 1°), with Shift by 10; Home and
  End go to the ends of the hue; Tab walks the selector and stays in it.
- **The hex field** takes `#rrggbb` as it is typed and `#rgb` once typing is over; anything else goes back to
  the colour.
- **Its click never reaches what is around it** (a card that opens on a tap).
- Never the browser's own `<input type="color">`: it looks different on every system and not like the kit.

## API

| | Name | Type | |
| --- | --- | --- | --- |
| model | `value` | `string` | `[(value)]`. Any CSS colour comes in (a hex, `oklch()`, `var(--…)`); what is picked goes out as `#rrggbb` |
| input | `label` | `string` | required: what the colour is, for a screen reader ("Shift colour") |
| input | `choices` | `LenziColorChoice[]` (`{ value, label }`) | the app's palette, offered under the selector; none by default |
| input | `size` | `number` | the swatch's diameter in px; 32 |
| input | `disabled` | `boolean` | |
| input | `confirm` | `boolean` | the snackbar that asks to keep the new colour; `true`. Off only where the app gives its own way back |
| output | `picked` | `string` | the final `#rrggbb` when the selector closes, if it changed; again, with the colour before, when the snackbar goes back |

Also exported: `parseHexColor()`, `toHexColor()` (any CSS colour to `#rrggbb`), `hexToHsv()`, `hsvToHex()`.

## Example

```html
<lenzi-color-picker label="Shift colour" [(value)]="colour" [choices]="palette" (picked)="save($event)" />
```

```ts
colour = signal('#d5baff');
palette: LenziColorChoice[] = [
  { value: 'var(--mat-sys-primary)', label: 'Violet' },
  { value: '#ffd54f', label: 'Amber' },
];
```

## Variables

`--lenzi-border`, `--lenzi-panel-radius`, `--lenzi-option-radius`, `--lenzi-glass`, `--lenzi-glass-filter`,
`--lenzi-panel-in`.

## Origin

New in the kit (2026-11-12), first used by the catalog: the variables, the demos' colour parameters, the
theme's colours.

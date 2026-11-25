# Pill toggle

`<lenzi-pill-toggle>`: one pill that reads what the figure beside it shows ("price", "qty"), and switches it at
a tap (lenzi, 2026-10-09: "a toggle on the left for price/qty (pill that changes state not ( 1 | 2 )").

## When to use

- A figure that can be read two (or more) ways: the pill on its left, the figure with no word of its own.

## When not to use

- Choices side by side: a toggle group.

## Rules

- **Drawn as the chosen side of a toggle group**: 32 px high, round ends, `secondary-container`, the 1 px
  outline; 10 px at the sides of the word (`--lenzi-pill-padding`).
- **Its tap never reaches what is around it** (a card that opens on a tap).
- **The figure does not move** when it switches: Material's least button width makes "qty" as wide as
  "price".
- **Its accessible name says what it reads, then what a tap does**: "price. Show the quantity".
- What it shows is remembered per item when it is a display preference (`writePreference`).

## API

| | Name | Type | |
| --- | --- | --- |
| input | `options` | `LenziPillOption<T>[]` (`{ value, label, ariaLabel? }`) | in the order a tap walks them |
| model | `value` | `T` | `[(value)]` |

## Example

```html
<lenzi-pill-toggle [options]="measures" [(value)]="measure" />
<span class="figure">{{ measure() === 'price' ? price : quantity }}</span>
```

## Variables

`--lenzi-toggle-height`, `--lenzi-pill-padding`.

## Origin

substance-tracker `ui/measure-toggle` (2026-10-09).

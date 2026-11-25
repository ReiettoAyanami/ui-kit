# Glass switch

`<lenzi-glass-switch>`: on or off, the way Apple's switch is (`@lenzi/ui-kit/backgrounds`).

## Rules

- **A capsule track**, grey off, the accent on; **a light capsule thumb** on its side.
- **Held, the thumb is Liquid Glass** (kube.io's switch: "a lip bezel ... the center slider zoomed out, while the edges
  refract the inside"): larger, bending the track under it, its edge taking the track's colour; it follows the pointer
  and **settles solid** on the side it is let go (lenzi, 2026-11-25: "implementa gli slider/toggle/searchbar nel kit come
  quelli di apple").
- **A tap switches it; a drag puts it where it is let go**; Space and Enter switch it.
- **A `role="switch"`** with its name and `aria-checked`.
- Chromium bends; elsewhere the glass is blurred only.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| model | `checked` | `boolean` | `false` |
| input | `label` | `string` | required (for a screen reader) |
| input | `disabled` | `boolean` | `false` |

## Example

```html
<lenzi-glass-switch label="Notifications" [(checked)]="notifications" />
```

## Variables

`--mat-sys-primary`, `--mat-sys-inverse-surface`, `--lenzi-border-focus`; the glass: `LENS_SETTINGS` (`glass-controls/lens.ts`:
a lip bezel, refraction 1, blur 0.2, specular 0.5 and 6).

## Origin

New in the kit, 2026-11-25, after Apple's controls and kube.io's demonstrations.

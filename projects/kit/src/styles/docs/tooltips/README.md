# Tooltips

Material's tooltips, drawn by the kit as dark glass with a 2 px border, not Material's light box.

## Rules

- **Dark glass** like a window (lenzi, 2026-10-02: "mettile scure se il tema è scuro"), the theme's text
  colour, a border so its edge reads over a dark page.
- **Two lines** when needed (a name, then a figure): `matTooltipClass="kit-tooltip-lines"` and `\n` between
  the lines.
- **A tooltip only adds**: what it says must not be the only way to know it (an icon button has its
  `aria-label`).
- Charts' tooltips take the same glass (KitChart).

## Example

```html
<span [matTooltip]="name + '\n' + price" matTooltipClass="kit-tooltip-lines">…</span>
```

## Origin

substance-tracker `styles.css`, "Tooltips" (2026-10-02).

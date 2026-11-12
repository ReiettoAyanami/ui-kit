# Add button

`<lenzi-add-button>`: the floating "+" at the bottom right of the screen, the page's one way of adding. It only
says it was pressed; the page decides what opens.

## When to use

- The page's main "create": a consumption on the consumptions page, a substance or a batch on the
  substances page.

## When not to use

- Any other action (edit, filter, refresh, export): a button in the page.
- Twice on one page.

## Rules

- **Bottom right**, above the page (z-index 10) and under the windows, clear of the phone's gesture bar.
- **64 px, its icon 28** (lenzi, 2026-09-29: a little larger than Material's 56 dp).
- **Its label** says what it adds, in whole words, for screen readers: "Add substance", "Add substance or
  batch".
- It opens a form in a dialog (`LenziDialogs`), so the back button closes it.

## API

| | Name | Type | Default | |
| --- | --- | --- | --- | --- |
| input | `label` | `string` | required | what it does, for screen readers |
| input | `placement` | `'fixed' \| 'inline'` | `'fixed'` | inline only for the catalog |
| output | `pressed` | `void` | | |

## Example

```html
<lenzi-add-button label="Add consumption" (pressed)="add()" />
```

## Variables

`--lenzi-fab-size`, `--lenzi-fab-icon`.

## Origin

substance-tracker and vtiger-reader `ui/add-button` (the same in both).

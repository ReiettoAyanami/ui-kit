# Card menu

`<kit-card-menu>`: the ⋮ of a card, at its top right, opening a Material menu of the card's actions (Details,
Edit, Delete). Its taps never reach the card, which opens its page or its details on a tap.

## Rules

- **Three vertical dots at the card's top right** (lenzi, 2026-09-30: "in alto a destra come card
  substances").
- **Its taps never open the card.**
- **Delete asks first** (`KitConfirmDialog`) and is in the error colour (`destructive: true`).
- Actions in whole words, each with its icon; Delete last.
- A card the user cannot act on (the signed-in admin's own card) has no menu.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `actions` | `KitMenuAction[]` (`{ id, label, icon?, destructive?, disabled? }`) | required |
| input | `label` | `string` | `'More actions'` (say which card: "Actions for Birra") |
| output | `action` | `string` | the id chosen |

## Example

```html
<mat-card appearance="outlined" class="card" (click)="open()">
  <kit-card-menu class="menu" [label]="'Actions for ' + substance.name" [actions]="actions" (action)="act($event)" />
  …
</mat-card>
```

```css
.card { position: relative; }
.menu { position: absolute; top: 4px; right: 4px; }
```

## Origin

substance-tracker's substance, consumption and user cards (the same ⋮ written in each).

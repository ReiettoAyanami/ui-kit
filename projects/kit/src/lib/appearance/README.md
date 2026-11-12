# Setup and appearance

`provideLenziKit()`: what every app of the kit provides once. `LenziAppearance`: how the app looks on this browser,
today one choice: Reduce transparency.

## provideLenziKit()

- Windows open and close a little slower than Material's (lenzi, 2026-10-02: "poco più lente"): content fades
  in over 250 ms, the window fades out in 150.
- The look this browser chose applies from the first page.
- `appId`: the name the browser preferences are kept under. An app that had its own before the kit gives its
  old name (`'substance-tracker'`), so nobody loses a choice.

## LenziAppearance

- **Reduce transparency** (lenzi, 2026-10-01), like Android's own switch: every glass surface solid again.
  The system's `prefers-reduced-transparency` is followed by the styles too.
- **A display choice**: remembered by the browser (`<appId>.reduce-transparency`), never in a database.
- `reduceTransparency` (a signal), `setReduceTransparency(reduce)`.

## Example

```ts
providers: [provideLenziKit({ appId: 'my-app' })]
```

```html
<mat-slide-toggle [checked]="appearance.reduceTransparency()" (change)="appearance.setReduceTransparency($event.checked)">
  Reduce transparency
</mat-slide-toggle>
```

## Origin

substance-tracker `ui/appearance.ts` and `app.config.ts`.

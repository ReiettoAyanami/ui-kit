# Confirm dialog

`LenziConfirmDialog`, opened with `LenziDialogs`: asks before an action and runs it. Closes with `true` once the
action succeeded, with nothing on Cancel; on a failure it stays open and says why (the API's detail and
status).

## Rules

- **Destructive actions always ask first** (delete, and what goes with it: "Its consumptions are deleted
  too."); their button is in the error colour.
- **Signing out asks too** (lenzi, 2026-10-03), not destructive.
- **The confirm button is disabled while the action runs** (no double submit).
- **A failure keeps it open** with the reason: "Batch 8 is finished (409)".
- **The back button closes it**, as every dialog opened with `LenziDialogs` (`dialogs/README.md`).
- The title is a question; the message says what confirming costs; the buttons are whole words.

## API

`LenziConfirmData`: `{ title, message, confirm, cancel?, destructive? (default true), action: () => Observable | Promise }`.

Opened with `LenziDialogs.open<LenziConfirmDialog, LenziConfirmData, true>(LenziConfirmDialog, data, config?)`
(`dialogs/README.md`): `true` once the action succeeded, `undefined` otherwise.

## Example

```ts
const deleted = await this.dialogs.open<LenziConfirmDialog, LenziConfirmData, true>(LenziConfirmDialog, {
  title: 'Delete “Peroni 6-pack”?',
  message: 'Its consumptions are deleted too.',
  confirm: 'Delete',
  action: () => this.ledger.deleteBatch(batch.id),
});
if (deleted) this.reload();
```

## Origin

substance-tracker and vtiger-reader `confirm-dialog` (identical). `LenziDialogs`, from substance-tracker
`history-dialogs.ts`, has its own page (`dialogs/README.md`).

# AI notes: Dialogs

- Open every dialog with `inject(LenziDialogs).open(Component, data, config?)` and `await` it: confirmations, entity
  forms, details. Never `MatDialog.open`, never a route of its own for a dialog.
- The dialog component reads its data with `inject(MAT_DIALOG_DATA)` and closes with `MatDialogRef.close(result)`.
  Never `history.back()` or `Location.back()` to close it yourself: the kit removes its history entry.
- Refresh or navigate only after the promise has resolved; `undefined` means it was dismissed (back, Escape, outside).
- A destructive action is `LenziConfirmDialog` (`confirm-dialog/AI.md`), never a form dialog of your own asking "Are
  you sure?".
- An entity's form is one component for new and edit (its mode from its input), Save disabled on tap, closing on the
  server's success; never close it before the server answered.
- A window of details: `{ panelClass: 'lenzi-dialog-raised' }` as `config`; never restyle the dialog's surface.

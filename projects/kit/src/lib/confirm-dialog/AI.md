# AI notes: Confirm dialog

- Every dialog of an app opens with `LenziDialogs.open` (forms too), never `MatDialog.open` directly.
- `action` is the request itself; the dialog waits for it. Do not close the dialog yourself, do not show your
  own error.
- After it resolves `true`, refresh what changed (the list, the item's page); navigate only after it resolves.
- Entity forms are their own components opened the same way; they disable Save on tap and close on the
  server's success.

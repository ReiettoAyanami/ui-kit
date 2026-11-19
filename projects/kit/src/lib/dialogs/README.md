# Dialogs

`LenziDialogs` (`@lenzi/ui-kit`): opens every dialog of an app, a confirmation, an entity's form, a window of details,
with its own entry in the browser's history, so the back button closes it (lenzi, 2026-10-03). A Material dialog
underneath (`MatDialog`), with the kit's width.

## What it does

- **The back closes the dialog and stays on the page**: the browser's back, also the phone's back gesture. The URL
  never changes while it is open.
- **Closed any other way** (its buttons, Escape, a click outside), its history entry is removed: one back later goes to
  the page before, not to a dialog already closed.
- **A link in the dialog to another page** closes it, and the new page takes the place of its entry: back returns to
  the page that was under the dialog.
- **It resolves once its history entry is gone**: a page that reads the history state when it closes reads the right
  one, and a navigation started at once is not cancelled by that back (lenzi, 2026-10-03: after Sign out the app stayed
  on the page).
- 560 px wide, never wider than the screen less 32 px; `config` (Material's `MatDialogConfig`) can change it.

## Rules

- **Every dialog opens with `LenziDialogs`**, forms too (RULES.md, "Dialogs and forms": the back button closes a
  dialog). Never `MatDialog.open` directly.
- **Destructive actions ask first** with `LenziConfirmDialog` (`confirm-dialog/README.md`), opened the same way.
- **A form in a dialog**: one component per entity, its Save disabled on tap, closing on the server's success; on a
  400 it stays open with each error under its field.
- **A lighter window** (details): `panelClass: 'lenzi-dialog-raised'` in `config`.
- Act on what it gives back (refresh, navigate) only once it has resolved.

## API

| | Name | What |
| --- | --- | --- |
| service | `LenziDialogs` | `providedIn: 'root'` |
| method | `open<C, D, R>(component, data, config?)` | `Promise<R \| undefined>`: what the dialog closed with, once its history entry is gone; `undefined` when it was closed by the back, Escape, a click outside, or a link to another page |

The dialog's component reads `data` with `inject(MAT_DIALOG_DATA)` and closes with `inject(MatDialogRef).close(result)`.

## Example

```ts
const name = await this.dialogs.open<RenameDialog, { name: string }, string>(RenameDialog, { name: batch.name });
if (name) this.rename(name);
```

```ts
@Component({ imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule], templateUrl: './rename-dialog.html' })
export class RenameDialog {
  protected readonly data = inject<{ name: string }>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<RenameDialog, string>>(MatDialogRef);
  save(name: string): void {
    this.ref.close(name);
  }
}
```

## Origin

substance-tracker `history-dialogs.ts` (2026-10-03). Documented on a page of its own on 2026-11-19 (until then inside
the confirm dialog's), when an app written from scratch with the kit looked for it here.

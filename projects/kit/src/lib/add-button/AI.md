# AI notes: Add button

- Only for the page's primary create action, once per page, in the page's template.
- `(pressed)` → `LenziDialogs.open(TheEntityForm, …)`; after a save, show the new item without reloading the
  whole list.
- A list under it needs room at its end (about 88 px of bottom padding) so the "+" never covers its last item.
- Never: another icon, another size, another position, `placement="inline"` in an app, a label on screen.

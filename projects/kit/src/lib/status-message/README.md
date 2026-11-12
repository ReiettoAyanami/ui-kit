# Status message

`<lenzi-status-message>`: what a list or a panel says instead of its content: "…" while it loads, a short
sentence when there is nothing, and why it failed, so a failure is never a blank page.

## Rules

- **Loading**: "…" (or a sentence), only while nothing is on screen yet; a list that reloads keeps what it
  shows (`keptValue`).
- **Empty**: a short sentence, shown only once the answer is known: "No substances", "No consumptions".
- **Failed**: "Could not load the substances: Not found (404)" (`couldNotLoad(what, error)`), as an alert, in
  the error colour.
- **In a card**: centred with room around it; **inside a list or a panel**: `compact`.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `kind` | `'loading' \| 'empty' \| 'error'` | `'empty'` |
| input | `text` | `string` | `''` ("…" while loading) |
| input | `compact` | `boolean` | `false` |

## Example

```html
@if (list.error()) {
  <lenzi-status-message kind="error" [text]="couldNotLoad('the substances', list.error())" />
} @else if (rows(); as rows) {
  @for (row of rows; track row.id) { … } @empty { <lenzi-status-message text="No substances" /> }
} @else {
  <lenzi-status-message kind="loading" />
}
```

## Origin

substance-tracker's pages and widgets ("Could not load the substances: <title> (<status>)", "…").

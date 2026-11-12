# Search bar

`<lenzi-search-bar>`: an elongated circle like a browser's bar (lenzi, 2026-09-30: "come la barra di Chrome …
non quadrato con i bordi smussati"): a magnifier at the left, what it looks for written inside it, a ✕ that
clears it.

## Rules

- **Only search bars** have this shape; every other text field keeps Material's corners.
- **48 px high**, its ends half circles (`--lenzi-search-height`).
- **It searches as it is typed**, once the typing pauses (300 ms), with no button (lenzi, 2026-09-30).
- **The ✕ brings the whole list back at once.**
- **The text lives in the page's URL** (`?q=`), replacing the entry, so back does not walk through the
  letters and a link, a refresh and back keep the search. That is the page's job: it gives `value` and
  hears `search`.
- **Nothing found** says so with what was searched: "No substance or batch with “…” in its name"
  (`LenziStatusMessage`).

## API

| | Name | Type | Default | |
| --- | --- | --- | --- | --- |
| input | `placeholder` | `string` | required | also its accessible name |
| model | `value` | `string` | `''` | the text, at every key |
| input | `debounce` | `number` | `300` | ms of pause before `search` |
| output | `search` | `string` | | the trimmed text, after a pause; `''` at once when cleared |

## Example

```html
<lenzi-search-bar placeholder="Search substances and batches" [value]="q() ?? ''" (search)="search($event)" />
```

```ts
search(text: string) {
  this.router.navigate([], { queryParams: { q: text || null }, queryParamsHandling: 'merge', replaceUrl: true });
}
```

## Variables

`--lenzi-search-height`.

## Origin

substance-tracker's substances search (`styles.css` `.search-bar`, 2026-09-30).

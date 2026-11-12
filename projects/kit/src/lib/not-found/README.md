# Not found

`<kit-not-found>`: an address that does not exist. An old address, a typo, a page of someone else all look
the same: a card in the middle of the page, "404", "Page not found", and one way out.

## Rules

- **One way out**, a filled button, in whole words: "Go to your consumptions", "Sign in".
- **The same page for every missing thing**: never say whether something exists for someone else.
- A standalone card: 28 px corners, the border of every surface.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `linkLabel` | `string` | required |
| input | `link` | `string \| unknown[]` | required |
| input | `code` | `string` | `'404'` |
| input | `title` | `string` | `'Page not found'` |
| input | `text` | `string` | `'There is nothing at this address.'` |

A second action goes inside it (`<ng-content>`).

## Example

```ts
{ path: '**', title: 'Not found', component: KitNotFound, data: { linkLabel: 'Go to the tickets', link: '/' } }
```

(with `withComponentInputBinding()`, route data become its inputs).

## Origin

substance-tracker and vtiger-reader `not-found-page`.

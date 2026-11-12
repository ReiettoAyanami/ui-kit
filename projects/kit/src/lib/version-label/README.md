# Version label

`<kit-version-label>`: the app's version in the bottom right corner of every page, small and faint, under the
"+" and the windows, never in the way of a tap (lenzi, 2026-10-03: "metti in basso la sottoversione in basso a
destra").

## Rules

- **Every page**, one instance after the shell.
- **The version the server runs** (from its API), not a number written in the frontend; nothing shows until
  it is known.
- label-small, 60% opacity, no pointer events.

## API

| | Name | Type | Default | |
| --- | --- | --- | --- | --- |
| input | `version` | `string \| null` | `null` | |
| input | `placement` | `'fixed' \| 'inline'` | `'fixed'` | inline only for the catalog |

## Example

```html
<kit-version-label [version]="version.value() ?? null" />
```

## Origin

substance-tracker and vtiger-reader `ui/version-label` (the request to the API stays in the app).

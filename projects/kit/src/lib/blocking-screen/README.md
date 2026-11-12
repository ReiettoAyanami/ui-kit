# Blocking screen

`<kit-blocking-screen>`: a screen over everything that cannot be closed, when the app cannot go on until the
user does something outside it ("Update required": the app is older than its server).

## Rules

- **Only for what truly blocks.** Anything else is an info bar.
- **A card in the middle**: an icon, a title in a few words, what happened and what to do, **one way out**.
- **The way out the user should take is filled**; the only one there is but not a good one is outlined.
- Nothing behind it can be reached; inside the safe area of an edge-to-edge app.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `title` | `string` | required |
| input | `icon` | `string \| null` | `null` |
| input | `actionLabel` | `string \| null` | `null` |
| input | `actionHref` | `string \| null` | `null` |
| input | `actionKind` | `'flat' \| 'stroked'` | `'flat'` |
| input | `placement` | `'fixed' \| 'inline'` | `'fixed'` |
| output | `action` | `void` | |

The text is its content.

## Origin

substance-tracker `ui/update-notice`, "Update required" and "Your server is older" (2.9).

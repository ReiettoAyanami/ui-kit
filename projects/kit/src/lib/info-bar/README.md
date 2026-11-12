# Info bar

`<lenzi-info-bar>`: a bar that stands out from every page, never in glass: an icon, a sentence, at most one
action. It cannot be closed: it goes when what it says stops being true.

## Uses

| Use | Tone | Where in the shell | Example |
| --- | --- | --- | --- |
| a state of the app | `neutral` | `lenziShellBelow` | "Offline · data from 14:32" |
| news | `secondary` | `lenziShellBelow` | "A new version of the app is available" · Download |
| something unusual not to forget | `tertiary` | `lenziShellBanner` | "Viewing as lenzi" · Exit |

## Rules

- **Solid**, 16 px corners, never glass.
- **One sentence**, cut with "…" when it does not fit.
- **At most one action**, a whole word, bold, in the bar's own colour; disabled while it runs.
- **Not closable.**
- A bar above the top bar (`lenziShellBanner`) sticks with it.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `icon` | `string \| null` | `null` |
| input | `tone` | `'neutral' \| 'secondary' \| 'tertiary'` | `'neutral'` |
| input | `actionLabel` | `string \| null` | `null` |
| input | `actionHref` | `string \| null` | `null` (a link out) |
| input | `actionDisabled` | `boolean` | `false` |
| output | `action` | `void` | |

The sentence is its content.

## Origin

substance-tracker's offline bar, viewing-as bar and update bar (the same shape, three times).

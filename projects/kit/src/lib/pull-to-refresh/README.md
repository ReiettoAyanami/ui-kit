# Pull to refresh

`<kit-pull-to-refresh>`: with the page at its top, a finger pulling down brings a disc down from under the top
bar, its arrow turning with the pull; let go beyond the threshold, the arrow spins while the page asks for its
data again, then the disc goes back up. Only the gesture, no button.

## Rules

- **Touch only**: a mouse never pulls.
- **Only from the top of the page**, and only on the page itself: the drawer, the dialogs and the overlays never
  start one.
- **Not on every route**: settings and page windows say `data: { pullToRefresh: false }`.
- **Material 3's disc**: 40 px, under the top bar, above the page.
- **72 px of pull** to refresh; the disc follows the finger at half its speed.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `refresh` | `() => Promise<unknown>` | required |
| input | `label` | `string` | `'Refreshing'` |

## Example

```html
<kit-app-shell>
  …
  @if (inApp) { <kit-pull-to-refresh kitShellBelow [refresh]="refresh" /> }
  <router-outlet />
</kit-app-shell>
```

## Origin

substance-tracker `ui/pull-to-refresh` (its Android app, roadmap 2.11).

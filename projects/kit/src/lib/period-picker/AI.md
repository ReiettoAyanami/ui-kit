# AI notes: Period picker

- Host it in a `display: flex; flex-wrap: wrap; gap: 12px` row.
- The API resolves the period ("last N days" up to today) and the scale: send them as they are, do not
  compute dates in the browser.
- Remember the choice per page with `readPreference` / `writePreference` when it is a display choice.

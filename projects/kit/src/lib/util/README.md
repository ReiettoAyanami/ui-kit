# Utilities

Small functions every app needs, the same way.

## describeError(error) and couldNotLoad(what, error)

- **One line for a failure**: the API's detail (or title), then its status in brackets: "Batch 8 is finished
  (409)". It unwraps a resource's error (`cause`).
- **What a page says when a load failed**: "Could not load the substances: Not found (404)".

## keptValue(resource, key?)

- **A resource's value that stays on screen while the next one loads** (lenzi, 2026-10-01: a toggle made a
  window shrink and replay its opening). Null before the first answer, after a failure, and when `key`
  changes (another thing is shown, not the same thing again).

## readPreference(key, valid, fallback) and writePreference(key, value)

- **A display choice this browser remembers** (a period, a toggle), in localStorage, never in a database. An
  invalid stored value, or a browser that keeps nothing, gives the fallback.
- Keys start with the app's id: `'substance-tracker.card-measure'`.

## Origin

substance-tracker `ui/kept-value.ts`, `ui/preferences.ts`, its pages' failure lines.

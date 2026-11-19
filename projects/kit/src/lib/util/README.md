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

## lenziPhone() and LENZI_PHONE_QUERY

- **A phone is a window under 600 px wide**, in the kit's styles (`@media (max-width: 599px)`) and in code: the
  same line, so the page and what the code chooses turn to the phone together (lenzi, 2026-11-20).
- **`lenziPhone()`**: a signal, true on a phone, changing when the window crosses the line (a window resized, a
  phone turned). Call it where `inject()` works (a field, a constructor). One listener for the whole app
  (`LenziPhone`, a root service), nothing to take away.
- **`LENZI_PHONE_QUERY`**: the line itself, `'(max-width: 599px)'`, for what needs the query.
- A scene that is lighter on a phone needs no code: `<lenzi-scene [phoneScene]>` (`backgrounds/src/scene`).

## Origin

substance-tracker `ui/kept-value.ts`, `ui/preferences.ts`, its pages' failure lines. `lenziPhone()`: the catalog's
`PHONE_QUERY`, which lenzi-dev had written again in its home page (2026-11-20).

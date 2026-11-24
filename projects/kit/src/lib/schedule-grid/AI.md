# AI notes: Schedule grid

- The days come from the API (weekday, weekend, holiday, today): do not compute calendars in the browser; map the
  API's days to `LenziScheduleDay` (`off` = weekend or holiday, `title` = the holiday's name or the whole date).
- Colour a cell with `identityColor(id)` of the code it shows (an index the API's list of codes gives, stable from
  month to month); a person's dot with `identityColor(id, 0.5)`. Never a colour by hand, never a status colour.
- Two facts in a cell: `text` and `detail`, never joined into one string.
- `label` of a cell: the whole words a screen reader needs ("Shift T1, on call RS"); `emptyLabel` in the app's
  language.
- `editable` + `(picked)` → open a form with `LenziDialogs`; save through the API; give the grid the new rows. Never
  change a cell in the grid's input in place.
- Put it in the page's column at full width; it scrolls by itself. To keep it shorter than the window, give its host
  a `max-height` (the box inherits it).

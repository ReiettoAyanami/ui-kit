# AI notes: Schedule grid

- The days come from the API (weekday, weekend, holiday, today): do not compute calendars in the browser; map the
  API's days to `LenziScheduleDay` (`off` = weekend or holiday, `title` = the holiday's name or the whole date).
- Colour a cell with the colour of the code it shows: the one the user chose, as the API gives it, or
  `identityColor(id)` of a stable index when the app has no chosen colours; a person's dot with `identityColor(id,
  0.5)`. Never a colour written in the code, never a status colour.
- A rule broken: the API says which days (never check rules in the browser); give the cell `problem` in words, and
  list the same problems under the grid.
- Two facts in a cell: `text` and `detail`, never joined into one string.
- A word too long for a cell ("Malattia"): an `icon`, with the word in `label` (and in `text`, for the code that reads it).
- `label` of a cell: the whole words a screen reader needs ("Shift T1, on call RS"); `emptyLabel` in the app's
  language.
- `editable` + `(picked)` → open a form with `LenziDialogs`; save through the API; give the grid the new rows. Never
  change a cell in the grid's input in place.
- Put it in the page's column at full width; it scrolls by itself. To keep it shorter than the window, give its host
  a `max-height` (the box inherits it).

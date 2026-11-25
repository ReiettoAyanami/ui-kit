# Schedule grid

`<lenzi-schedule-grid>`: who does what on which day. One row per person, their name fixed at the left; one column
per day, its number on top and its weekday under it; in each cell a short code (a shift) in its identity colour, a
second fact under it (an on-call). Days off are shaded, today is marked, the row of the person looking stands out.

## When to use

- A month (or a week) of shifts, rotas, bookings: few rows, many days, a short code per cell.
- Not for figures (`LenziDataTable`), not for one person's list of days (a list of cards).

## Rules

- **Names bold at the left**, with their identity dot, cut when long; they stay while the grid scrolls sideways.
- **A day is its number on top, bold, its weekday under it** (RULES.md, "Figures": name on top, value under).
- **One fact a line in a cell**: the code on top, bold; a second fact under it, smaller. Never "T1 / RS" or
  "T1 · RS" on one line.
- **A cell's colour is the colour of what it says**, the same in every month: its identity colour
  (`identityColor` of the code's id), or the colour the user chose for it when the app lets them (lenzi,
  2026-11-25: "I colori dei turni devono essere più diversificati e controllabili": the shifts app lets the manager
  pick each shift's colour with `LenziColorPicker`). Never a status colour, never a colour written in the code.
- **A second fact has its own colour's dot** before it (`detailColor`), when it is a thing with a colour (an
  on-call).
- **A cell that breaks a rule is marked** (lenzi, 2026-11-25: "fai apparire gli errori nella scheda della griglia"):
  its tag outlined in `--lenzi-status-bad`, a "!" at its corner, the rule in its tooltip and in what a screen reader
  hears. The page lists the same errors under the grid, in words.
- **Days off are shaded** (weekends, holidays), **today is in the accent**, and the grid opens scrolled to today.
- **It scrolls inside its own box**, sideways and down, the header and the names in place; never the page. A phone
  scrolls it: do not hide days to make it fit.
- **Editable: every cell is a button**, empty ones too, and says which was tapped; the page opens what changes it
  (a dialog with `LenziDialogs`). It never changes a cell by itself.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `nameHeader` | `string` | required |
| input | `label` | `string` | required (for a screen reader) |
| input | `days` | `LenziScheduleDay[]` (`{ key, label, caption?, off?, today?, title? }`) | required |
| input | `rows` | `LenziScheduleRow[]` (`{ id, name, color?, cells: { [dayKey]: LenziScheduleCell } }`) | required |
| input | `highlight` | `string \| number \| null` | `null` (a row's id) |
| input | `editable` | `boolean` | `false` |
| input | `emptyLabel` | `string` | `'Empty'` (what a screen reader hears for an empty cell) |
| output | `picked` | `LenziSchedulePick` (`{ row, day, cell }`) | |

`LenziScheduleCell`: `{ text, detail?, color?, detailColor?, label?, problem? }`; `label` is what a screen reader hears
and the tooltip; `problem` the rule it breaks, in words.

## Example

```html
<lenzi-schedule-grid
  nameHeader="Person"
  label="Shifts of January"
  [days]="days()"
  [rows]="rows()"
  [highlight]="me()"
  editable
  (picked)="change($event)"
/>
```

## Variables

`--lenzi-status-bad`, `--lenzi-border`, `--lenzi-panel-radius`, `--lenzi-option-radius`, `--lenzi-dot-size`, `--lenzi-border-focus`.

## Origin

The shifts dashboard (2026-11-24): the month sheets of the shifts workbook, one row per person and one column per
day.

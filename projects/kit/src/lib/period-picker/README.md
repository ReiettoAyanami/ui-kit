# Period picker

`<kit-period-picker>`: the two choices of whoever shows figures over time: the period (the last 7, 30, 90,
365 days, or all time) and the scale every rate and duration is read in (per day, week, month, year). Both
are always the user's to choose (lenzi).

## Rules

- **Two Material selects**, either left out when its value is null.
- **It keeps no state**: the choice goes out (`periodChange`, `scaleChange`) and comes back in.
- **Its fields are items of its host's row** (`display: contents`): put it in a flex row with the other
  choices; they wrap together.
- The choice is remembered by the browser when it is a display preference (`writePreference`), never in the
  database.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `period` | `number \| null` | `null` (days, 0 = all time) |
| input | `scale` | `string \| null` | `null` |
| input | `periods` | `KitPeriod[]` | `KIT_PERIODS` |
| input | `scales` | `string[]` | `KIT_SCALES` (day, week, month, year) |
| input | `periodLabel` / `scaleLabel` | `string` | `'Period'` / `'Per'` |
| output | `periodChange` / `scaleChange` | `number` / `string` | |

`kitPeriodLabel(days)`: "Last 30 days", "All time".

## Example

```html
<div class="choices">
  <kit-period-picker [period]="days()" [scale]="per()" (periodChange)="days.set($event)" (scaleChange)="per.set($event)" />
</div>
```

## Origin

substance-tracker `ui/period-scale`.

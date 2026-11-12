# AI notes: Chart

- Import from `@lenzi/ui-kit/charts`; the app installs `echarts` and `ngx-echarts`. Never import ECharts
  anywhere else.
- Build `LenziChartData` from the API's series: `periods` labelled (`lenziPeriodAxisLabel` for ISO keys),
  `current` the period still in progress, each line's `color` its identity colour.
- `format` formats with the app's currency or unit.
- Put it in a `LenziWidgetCard`. Pages with charts are lazy routes (ECharts is big).

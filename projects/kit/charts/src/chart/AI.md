# AI notes: Chart

- Import from `@lenzi/ui-kit/charts`; the app installs `echarts` and `ngx-echarts`. Never import ECharts
  anywhere else.
- Build `KitChartData` from the API's series: `periods` labelled (`kitPeriodAxisLabel` for ISO keys),
  `current` the period still in progress, each line's `color` its identity colour.
- `format` formats with the app's currency or unit.
- Put it in a `KitWidgetCard`. Pages with charts are lazy routes (ECharts is big).

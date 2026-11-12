import { LenziChartColors, LenziChartData, clockwise, escapeHtml, lenziChartOptions, lenziPeriodAxisLabel, lastStretch, lineTotal } from './chart-options';

const colors: LenziChartColors = {
  primary: 'violet',
  onSurface: 'white',
  onSurfaceVariant: 'grey',
  outline: 'o',
  outlineVariant: 'ov',
  surface: 's',
  font: 'Roboto Mono',
  glass: 'glass',
  glassFilter: 'blur(24px)',
  card: 'black',
  lines: { a: 'red', b: 'blue' },
};
const data: LenziChartData = {
  periods: ['W38', 'W39', 'W40'],
  current: 2,
  lines: [
    { key: 'a', name: 'Birra', values: ['2.000', 3, 1] },
    { key: 'b', name: '<b>Caffè</b>', values: [null, 1, 0] },
  ],
};
const format = (value: number) => `${value} u`;
type Series = { type: string; name: string; data: unknown[]; stack?: string; lineStyle?: { type?: string }; itemStyle?: unknown };

describe('lenziChartOptions', () => {
  it('bars: rounded, the period in progress striped and its label in the violet', () => {
    const options = lenziChartOptions({ data, type: 'bar', format, hidden: new Set(), colors }) as {
      series: Series[];
      xAxis: { axisLabel: { color: (v: string, i: number) => string } };
    };
    const bar = options.series[0]!.data as { value: number | null; itemStyle: { borderRadius: unknown; decal?: unknown } }[];
    expect(bar.map((b) => b.value)).toEqual([2, 3, 1]);
    expect(bar[0]!.itemStyle.borderRadius).toBe(6);
    expect(bar[0]!.itemStyle.decal).toBeUndefined();
    expect(bar[2]!.itemStyle.decal).toBeDefined();
    expect(options.xAxis.axisLabel.color('W40', 2)).toBe('violet');
    expect(options.xAxis.axisLabel.color('W39', 1)).toBe('grey');
    expect(options.series[0]!.stack).toBeUndefined();
  });

  it('stacked bars: one on the other, only the outer pieces rounded', () => {
    const options = lenziChartOptions({ data, type: 'stacked-bar', format, hidden: new Set(), colors }) as { series: Series[] };
    expect(options.series.every((s) => s.stack === 'total')).toBe(true);
    const bottom = options.series[0]!.data[1] as { itemStyle: { borderRadius: number[] } };
    const top = options.series[1]!.data[1] as { itemStyle: { borderRadius: number[] } };
    expect(bottom.itemStyle.borderRadius).toEqual([0, 0, 6, 6]);
    expect(top.itemStyle.borderRadius).toEqual([6, 6, 0, 0]);
  });

  it('lines: the stretch into the period in progress is dashed; a line with nothing there has none', () => {
    const options = lenziChartOptions({ data, type: 'line', format, hidden: new Set(), colors }) as { series: Series[] };
    const birra = options.series.filter((s) => s.name === 'Birra');
    expect(birra.length).toBe(2);
    expect(birra[1]!.lineStyle?.type).toBe('dashed');
    expect(birra[1]!.data).toEqual([null, 3, 1]);
    expect(lastStretch([1, null, null, 4], 3)).toEqual([1, null, null, 4]);
  });

  it('hidden lines are not drawn', () => {
    const options = lenziChartOptions({ data, type: 'bar', format, hidden: new Set(['a']), colors }) as { series: Series[] };
    expect(options.series.map((s) => s.name)).toEqual(['<b>Caffè</b>']);
  });

  it('donut and treemap: the totals, the empty ones left out', () => {
    const donut = lenziChartOptions({ data, type: 'donut', format, hidden: new Set(), colors }) as { series: { data: { name: string; value: number }[] }[] };
    expect(donut.series[0]!.data).toEqual([
      { name: 'Birra', value: 6, itemStyle: { color: 'red' } },
      { name: '<b>Caffè</b>', value: 1, itemStyle: { color: 'blue' } },
    ]);
    expect(lineTotal({ key: 'x', name: 'x', values: [null, null] })).toBeNull();
    expect(lineTotal({ key: 'x', name: 'x', values: [1], total: '9.50' })).toBe(9.5);
  });

  it('radar: the spokes clockwise from the top', () => {
    expect(clockwise(4)).toEqual([0, 3, 2, 1]);
    const radar = lenziChartOptions({ data, type: 'radar', format, hidden: new Set(), colors }) as { radar: { indicator: { name: string; color?: string }[] } };
    expect(radar.radar.indicator.map((i) => i.name)).toEqual(['W38', 'W40', 'W39']);
    expect(radar.radar.indicator[1]!.color).toBe('violet');
  });

  it('the names of the user go into the tooltip as text, never as markup', () => {
    expect(escapeHtml('<b>Caffè</b> & "tè"')).toBe('&lt;b&gt;Caffè&lt;/b&gt; &amp; &quot;tè&quot;');
  });

  it("an API's period keys read as an axis shows them", () => {
    expect(lenziPeriodAxisLabel('2026-09-29')).toBe('29 Sept');
    expect(lenziPeriodAxisLabel('2026-W40')).toBe('W40');
    expect(lenziPeriodAxisLabel('2026-09')).toBe('Sept 2026');
    expect(lenziPeriodAxisLabel('20')).toBe('20:00');
  });
});

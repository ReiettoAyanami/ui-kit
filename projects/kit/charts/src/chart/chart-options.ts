// The ECharts options of a KitChart, from its data and the theme's colours. A plain module (no
// schematic makes one): pure functions, tested on their own. From substance-tracker
// `ui/chart/chart-options.ts`, with the API's series replaced by plain lines.

/** How a chart draws its lines. */
export type KitChartType = 'bar' | 'stacked-bar' | 'line' | 'donut' | 'treemap' | 'radar';

/** One line of a chart: a substance, a person, a category. */
export interface KitChartLine {
  /** Unique within the chart. */
  key: string;
  /** Its name: the chip, the tooltip, the slice. */
  name: string;
  /** Its colour (CSS): its identity colour. Default: the identity colour of its position (1, 2, …). */
  color?: string;
  /** One value per period (numbers, or the API's decimal strings); null: nothing in that period. */
  values: readonly (number | string | null)[];
  /** Its total over the whole period, for a donut or a treemap; default: the sum of its values. */
  total?: number | string | null;
}

/** What a chart draws. */
export interface KitChartData {
  /** The periods, as the axis shows them: "29 Sept", "W40", "Sept 2026", "20:00". */
  periods: readonly string[];
  /** The period still in progress (not complete yet): its index, the last one usually. Null: none (the hours of the day). */
  current?: number | null;
  lines: readonly KitChartLine[];
}

/** The colours a chart takes from the Material 3 theme, resolved (ECharts needs real colours). */
export interface KitChartColors {
  /** The theme's violet: the label of the period in progress. */
  primary: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  surface: string;
  /** The font of the chart's text (ECharts draws its own): the theme's, Roboto Mono. */
  font: string;
  /** The tooltip's glass, as Material's tooltips: its see-through colour and its blur (none with Reduce transparency). */
  glass: string;
  glassFilter: string;
  /** The card under the chart: the gaps between slices and tiles, the text on a tile. */
  card: string;
  /** Each line's colour, by its key. */
  lines: Record<string, string>;
}

export interface KitChartInput {
  data: KitChartData;
  type: KitChartType;
  /** How a value reads in a tooltip and on the axis. */
  format: (value: number) => string;
  /** The lines hidden by hand (their keys). */
  hidden: ReadonlySet<string>;
  colors: KitChartColors;
}

/** "2026-09-29" → "29 Sept", "2026-W40" → "W40", "2026-09" → "Sept 2026", "20" → "20:00": an API's period keys as an axis shows them. */
export function kitPeriodAxisLabel(period: string, locale = 'en-GB'): string {
  if (/^\d{2}$/.test(period)) return `${period}:00`;
  if (/^\d{4}-W\d{2}$/.test(period)) return period.slice(5);
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${period}T00:00:00Z`));
  }
  if (/^\d{4}-\d{2}$/.test(period)) {
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${period}-01T00:00:00Z`));
  }
  return period;
}

/** A value as a number, to be drawn (the numbers themselves are the API's). */
const drawn = (value: number | string | null | undefined): number | null => (value === null || value === undefined ? null : Number(value));

/** A line's total: given, or the sum of its values. */
export function lineTotal(line: KitChartLine): number | null {
  if (line.total !== undefined) return drawn(line.total);
  const values = line.values.map(drawn).filter((v): v is number => v !== null);
  return values.length ? values.reduce((sum, v) => sum + v, 0) : null;
}

/** How round the bars and the donut's slices are, in px (the reference photo: rounded ends). */
const RADIUS = 6;

/** Oblique stripes over a bar (ECharts' decal): the period in progress, dark on the bright bars. */
export function hatch(color: string): Record<string, unknown> {
  return { symbol: 'rect', symbolSize: 1, dashArrayX: [1, 0], dashArrayY: [2, 4], rotation: -Math.PI / 4, color };
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** A name of the user's in the tooltip's HTML: as text, never as markup. */
export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]!);

/** One entry of ECharts' axis tooltip, as its formatter receives it. */
interface TooltipEntry {
  axisValueLabel: string;
  seriesName: string;
  marker: string;
  value: number | null | undefined;
}

/**
 * The options of the chart (RULES.md, "Charts"): bars (stacked when they add up), lines, a radar,
 * or a donut or a treemap of the lines' totals. Transparent background, text and a faint grid in
 * the theme's colours, no axis lines or ticks, each line in its colour: bars with rounded ends, the
 * period in progress striped with its label in the theme's violet; soft lines whose last stretch,
 * into the period in progress, is dashed.
 */
export function kitChartOptions({ data, type, format, hidden, colors }: KitChartInput): Record<string, unknown> {
  const lines = data.lines.filter((line) => !hidden.has(line.key));
  const valueFormatter = (value: number | null | undefined) => (value === null || value === undefined ? '—' : format(value));
  const tooltip = {
    // inside the chart, never cut by its card; a long name goes to the next line
    confine: true,
    extraCssText: `max-width: 280px; white-space: normal; backdrop-filter: ${colors.glassFilter};`,
    backgroundColor: colors.glass,
    borderColor: colors.outlineVariant,
    borderWidth: 2, // even corners, like every border (RULES.md, "Borders")
    textStyle: { color: colors.onSurface },
    valueFormatter,
  };
  // a little slower than ECharts' 300 ms (lenzi, 2026-10-02: "poco più lente"): drawn in 600, redrawn in 500
  const base = {
    backgroundColor: 'transparent',
    animationDuration: 600,
    animationDurationUpdate: 500,
    textStyle: { color: colors.onSurfaceVariant, fontFamily: colors.font },
  };

  if (type === 'donut') {
    return {
      ...base,
      tooltip: { ...tooltip, trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['48%', '72%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: colors.card, borderWidth: 2, borderRadius: RADIUS },
          // the share only: the chips above name the slices, and long names do not fit a phone
          percentPrecision: 0,
          label: { color: colors.onSurface, formatter: '{d}%' },
          data: lines
            .map((line) => ({ line, total: lineTotal(line) }))
            .filter(({ total }) => total !== null && total > 0)
            .map(({ line, total }) => ({ name: line.name, value: total, itemStyle: { color: colors.lines[line.key] } })),
        },
      ],
    };
  }

  if (type === 'treemap') {
    // Rounded tiles as large as each line's total, its name and its share written on it, dark on
    // the bright colours. The share is only how the total compares with the others shown.
    const shown = lines.map((line) => ({ line, total: lineTotal(line) })).filter(({ total }) => total !== null && total > 0);
    const whole = shown.reduce((sum, { total }) => sum + (total ?? 0), 0);
    return {
      ...base,
      tooltip: { ...tooltip, trigger: 'item' },
      series: [
        {
          type: 'treemap',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          itemStyle: { borderColor: colors.card, borderWidth: 4, gapWidth: 4, borderRadius: 12 },
          label: {
            position: 'insideTopLeft',
            padding: 8,
            color: colors.card,
            fontWeight: 500,
            overflow: 'truncate',
            formatter: (tile: { name: string; value: number }) => `${tile.name}\n${Math.round((tile.value / whole) * 100)}%`,
          },
          data: shown.map(({ line, total }) => ({ name: line.name, value: total, itemStyle: { color: colors.lines[line.key] } })),
        },
      ],
    };
  }

  const current = data.current ?? null;

  if (type === 'radar') {
    // The periods around a circle, clockwise from the top like a clock, one shape per line with its
    // area lightly filled; one scale for every spoke, so the shapes compare. A name on every spoke up
    // to a dozen, past that on one every so many; the period in progress named in violet. ECharts
    // goes round the other way: the spokes are given to it in reverse after the first.
    const order = clockwise(data.periods.length);
    const values = lines.map((line) => order.map((i) => drawn(line.values[i] ?? null)));
    const top = Math.max(0, ...values.flat().map((v) => v ?? 0));
    const every = Math.ceil(data.periods.length / 12);
    return {
      ...base,
      tooltip: { ...tooltip, trigger: 'item' },
      radar: {
        radius: '68%',
        indicator: order.map((i) => ({
          name: i % every === 0 || i === current ? data.periods[i]! : '',
          max: top > 0 ? top : 1,
          ...(i === current ? { color: colors.primary } : {}),
        })),
        axisName: { color: colors.onSurfaceVariant },
        axisLine: { lineStyle: { color: colors.outlineVariant } },
        splitLine: { lineStyle: { color: colors.outlineVariant } },
        splitArea: { show: false },
      },
      series: [
        {
          type: 'radar',
          symbol: 'none',
          data: lines.map((line, i) => ({
            name: line.name,
            value: values[i],
            itemStyle: { color: colors.lines[line.key] },
            lineStyle: { color: colors.lines[line.key], width: 2 },
            areaStyle: { color: colors.lines[line.key], opacity: 0.15 },
          })),
        },
      ],
    };
  }

  const axes = {
    // The axis labels stay inside the chart (ECharts 6's name for the old containLabel).
    grid: { left: 8, right: 16, top: 16, bottom: 8, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' },
    xAxis: {
      type: 'category',
      data: [...data.periods],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: (_: string, index: number) => (index === current ? colors.primary : colors.onSurfaceVariant) },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: colors.outlineVariant } },
      axisLabel: { color: colors.onSurfaceVariant, formatter: (v: number) => format(v) },
    },
  };

  if (type === 'bar' || type === 'stacked-bar') {
    // Bars of amounts that add up stand one on the other (the page says so: 'stacked-bar'); the
    // rest side by side.
    const stacked = type === 'stacked-bar';
    return {
      ...base,
      ...axes,
      tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      series: lines.map((line, index) => ({
        type: 'bar',
        name: line.name,
        barMaxWidth: 32,
        data: line.values.map((value, period) => ({
          value: drawn(value),
          itemStyle: {
            borderRadius: stacked ? stackRadius(lines, index, period) : RADIUS,
            ...(period === current ? { decal: hatch(colors.card) } : {}),
          },
        })),
        itemStyle: { color: colors.lines[line.key] },
        ...(stacked ? { stack: 'total' } : {}),
      })),
    };
  }

  // Lines: the stretch into the period in progress is a series of its own, dashed, with the line's
  // name; the tooltip shows each name once, with the value it has there.
  const showSymbol = data.periods.length <= 12;
  return {
    ...base,
    ...axes,
    tooltip: { ...tooltip, trigger: 'axis', formatter: (entries: TooltipEntry[]) => axisTooltip(entries, valueFormatter) },
    series: lines.flatMap((line) => {
      const values = line.values.map(drawn);
      const color = colors.lines[line.key];
      // soft, but never past its points: a curve does not dip under zero between two values
      const style = { type: 'line', name: line.name, itemStyle: { color }, smooth: 0.3, smoothMonotone: 'x', connectNulls: true, showSymbol };
      // nothing yet in the period in progress: no stretch to draw
      if (current === null || values[current] === null || values[current] === undefined) {
        return [{ ...style, data: values, lineStyle: { color, width: 2.5 } }];
      }
      return [
        { ...style, data: values.map((v, i) => (i === current ? null : v)), lineStyle: { color, width: 2.5 } },
        { ...style, data: lastStretch(values, current), lineStyle: { color, width: 2.5, type: 'dashed' } },
      ];
    }),
  };
}

/** The values of a line's dashed stretch: its last value before the period in progress and the one in it; nothing else. */
export function lastStretch(values: (number | null)[], current: number): (number | null)[] {
  let before = -1;
  for (let i = current - 1; i >= 0 && before < 0; i--) if (values[i] !== null) before = i;
  return values.map((v, i) => (i === current || i === before ? v : null));
}

/** The axis tooltip of the lines: the period, then each line once (its value where it has one). */
function axisTooltip(entries: TooltipEntry[], format: (value: number | null | undefined) => string): string {
  const seen = new Map<string, TooltipEntry>();
  for (const entry of entries) {
    const known = seen.get(entry.seriesName);
    if (!known || ((known.value ?? null) === null && (entry.value ?? null) !== null)) seen.set(entry.seriesName, entry);
  }
  const rows = [...seen.values()].map((e) => `${e.marker}${escapeHtml(e.seriesName)} <b>${escapeHtml(format(e.value))}</b>`);
  return [escapeHtml(entries[0]?.axisValueLabel ?? ''), ...rows].join('<br/>');
}

/**
 * The corners of a stacked bar's piece: the top piece of a period rounds its top, the bottom piece
 * its bottom (a piece alone, both); the pieces between stay square. Only the pieces drawn count.
 */
function stackRadius(lines: readonly KitChartLine[], index: number, period: number): number[] {
  const drawnHere = lines.map((line, i) => (Number(line.values[period] ?? 0) > 0 ? i : -1)).filter((i) => i >= 0);
  const top = index === drawnHere[drawnHere.length - 1] ? RADIUS : 0;
  const bottom = index === drawnHere[0] ? RADIUS : 0;
  return [top, top, bottom, bottom];
}

/** The order in which ECharts gets the spokes of a radar so that they read clockwise: 0, n-1, …, 1. */
export function clockwise(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i === 0 ? 0 : count - i));
}

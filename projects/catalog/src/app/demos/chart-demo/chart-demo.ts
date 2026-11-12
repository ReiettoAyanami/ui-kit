import { Component, computed, input } from '@angular/core';

import { LenziWidgetCard, identityColor } from '@lenzi/ui-kit';
import { LenziChart, LenziChartData, LenziChartType } from '@lenzi/ui-kit/charts';

import { Values } from '../../registry';

const NAMES = ['Birra', 'Caffè', 'Whisky', 'Sigarette', 'Tè verde', 'Gin'];
const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/** A chart in its card, with numbers made up for the demo (an app's come from its API). */
@Component({
  selector: 'app-chart-demo',
  imports: [LenziChart, LenziWidgetCard],
  templateUrl: './chart-demo.html',
  styleUrl: './chart-demo.css',
})
export class ChartDemo {
  readonly values = input<Values>({});

  protected readonly type = computed(() => String(this.values()['type'] ?? 'stacked-bar') as LenziChartType);
  protected readonly format = (value: number) => money.format(value);
  protected readonly data = computed<LenziChartData>(() => {
    const lines = Number(this.values()['lines'] ?? 3);
    const periods = Number(this.values()['periods'] ?? 8);
    return {
      periods: Array.from({ length: periods }, (_, i) => `W${30 + i}`),
      current: this.values()['current'] ? periods - 1 : null,
      lines: NAMES.slice(0, lines).map((name, line) => ({
        key: name,
        name,
        color: identityColor(line + 1),
        values: Array.from({ length: periods }, (_, i) => Math.round(8 + 6 * Math.sin(i / 1.7 + line) + line * 3 + (i % 3))),
      })),
    };
  });
}

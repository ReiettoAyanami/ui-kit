import { Component, computed, inject, input } from '@angular/core';

import { LenziSegment, LenziSegmentedBar } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** Batches of a stock: each as wide as what is left of it; a tiny one stays visible. */
@Component({
  selector: 'app-segmented-bar-demo',
  imports: [LenziSegmentedBar],
  templateUrl: './segmented-bar-demo.html',
  styleUrl: './segmented-bar-demo.css',
})
export class SegmentedBarDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);

  protected readonly segments = computed<LenziSegment[]>(() => {
    const count = Number(this.values()['count'] ?? 4);
    const used = Number(this.values()['used'] ?? 30) / 100;
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      value: ((100 / count) * (i === count - 1 ? 1 - used : 1)).toFixed(3),
      label: i === 1 ? null : `Batch ${i + 1}`,
      detail: `€${(1.2 - i * 0.05).toFixed(2)}/bottiglia`,
    }));
  });
  protected readonly only = computed(() => (this.values()['only'] ? { id: 1, value: 15, max: 25 } : null));

  protected select(id: number | string): void {
    this.events.log(`segment ${id}`);
  }
}

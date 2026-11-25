import { Component, inject, input, signal } from '@angular/core';
import { LenziGlassSegmented } from '@lenzi/ui-kit/backgrounds';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** LenziGlassSegmented over stripes of the theme's colours, so its glass has something to bend. */
@Component({
  selector: 'app-glass-segmented-demo',
  imports: [LenziGlassSegmented],
  templateUrl: './glass-segmented-demo.html',
  styleUrl: './glass-segmented-demo.css',
})
export class GlassSegmentedDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);
  protected readonly options = [
    { value: 'day', label: 'day' },
    { value: 'week', label: 'week' },
    { value: 'month', label: 'month' },
  ];
  protected readonly value = signal<string | null>('day');

  protected chose(value: string | null): void {
    this.value.set(value);
    this.events.log(`chose ${value}`);
  }
}

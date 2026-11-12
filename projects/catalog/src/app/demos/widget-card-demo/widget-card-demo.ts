import { Component, computed, inject, input, signal } from '@angular/core';

import { KitFigure, KitFigureGrid, KitSegmentedBar, KitWidgetCard } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

@Component({
  selector: 'app-widget-card-demo',
  imports: [KitFigure, KitFigureGrid, KitSegmentedBar, KitWidgetCard],
  templateUrl: './widget-card-demo.html',
  styleUrl: './widget-card-demo.css',
})
export class WidgetCardDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);

  protected readonly scale = signal('week');
  protected readonly scales = computed(() => (this.values()['scales'] ? ['day', 'week', 'month'] : []));
  protected readonly segments = [
    { id: 1, value: 45, label: 'Birra' },
    { id: 2, value: 30, label: 'Caffè' },
    { id: 3, value: 15, label: 'Whisky' },
  ];

  protected choose(scale: string): void {
    this.scale.set(scale);
    this.events.log(`interval: ${scale}`);
  }
}

import { Component, inject, input, signal } from '@angular/core';
import { LenziGlassList } from '@lenzi/ui-kit/backgrounds';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** LenziGlassList over stripes of the theme's colours, so its lens has something to bend; the chosen entry beside it. */
@Component({
  selector: 'app-glass-list-demo',
  imports: [LenziGlassList],
  templateUrl: './glass-list-demo.html',
  styleUrl: './glass-list-demo.css',
})
export class GlassListDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);
  protected readonly items = [
    { name: 'Glass slider', caption: "A player's volume and progress" },
    { name: 'Glass switch', caption: 'A list of settings' },
    { name: 'Figure and delta', caption: 'A stock at a glance' },
    { name: 'Schedule grid', caption: 'A week of shifts' },
  ];
  protected readonly selected = signal(0);

  protected chose(index: number): void {
    this.selected.set(index);
    this.events.log(`chose ${this.items[index]?.name}`);
  }
}

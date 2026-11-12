import { Component, inject, input, signal } from '@angular/core';

import { KitPeriodPicker, kitPeriodLabel } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

@Component({
  selector: 'app-period-picker-demo',
  imports: [KitPeriodPicker],
  templateUrl: './period-picker-demo.html',
  styleUrl: './period-picker-demo.css',
})
export class PeriodPickerDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);

  protected readonly days = signal(30);
  protected readonly per = signal('week');
  protected readonly label = kitPeriodLabel;

  protected period(days: number): void {
    this.days.set(days);
    this.events.log(`period: ${kitPeriodLabel(days)}`);
  }

  protected scale(per: string): void {
    this.per.set(per);
    this.events.log(`per ${per}`);
  }
}

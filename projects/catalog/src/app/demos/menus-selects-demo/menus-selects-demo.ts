import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** A select and a menu as the kit draws them: rounded glass panels, the chosen option a pill. */
@Component({
  selector: 'app-menus-selects-demo',
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatMenuModule, MatSelectModule],
  templateUrl: './menus-selects-demo.html',
  styleUrl: './menus-selects-demo.css',
})
export class MenusSelectsDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);

  protected readonly described = computed(() => this.values()['described'] === true);
  protected readonly days = signal(30);
  protected readonly metric = signal('spent');
  protected readonly periods = [
    { days: 7, label: 'Last 7 days' },
    { days: 30, label: 'Last 30 days' },
    { days: 90, label: 'Last 90 days' },
    { days: 0, label: 'All time' },
  ];
  protected readonly metrics = [
    { key: 'spent', label: 'Spent', description: 'What the consumptions of the period cost.' },
    { key: 'stock', label: 'Stock', description: 'What is left of the active batches.' },
    { key: 'per-day', label: 'Per day', description: 'What was used on an average day of the period.' },
  ];

  protected log(text: string): void {
    this.events.log(text);
  }
}

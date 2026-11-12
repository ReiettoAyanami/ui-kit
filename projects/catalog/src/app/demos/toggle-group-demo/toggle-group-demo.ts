import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** Material's toggle group, as the kit draws it: low pills, whole words. */
@Component({
  selector: 'app-toggle-group-demo',
  imports: [MatButtonToggleModule],
  templateUrl: './toggle-group-demo.html',
  styleUrl: './toggle-group-demo.css',
})
export class ToggleGroupDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);

  protected readonly options = computed(() =>
    String(this.values()['options'] ?? '')
      .split(',')
      .map((option) => option.trim())
      .filter(Boolean),
  );
  protected readonly chosen = linkedSignal(() => this.options()[0] ?? '');

  protected choose(value: string): void {
    this.chosen.set(value);
    this.events.log(`chose ${value}`);
  }
}

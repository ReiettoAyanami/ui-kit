import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';

import { LenziPillOption, LenziPillToggle } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** The pill on the left of its figure, the figure with no word of its own (substance-tracker's card line). */
@Component({
  selector: 'app-pill-toggle-demo',
  imports: [LenziPillToggle],
  templateUrl: './pill-toggle-demo.html',
  styleUrl: './pill-toggle-demo.css',
})
export class PillToggleDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);

  protected readonly options = computed<LenziPillOption<string>[]>(() => [
    { value: 'first', label: String(this.values()['first'] ?? 'price') },
    { value: 'second', label: String(this.values()['second'] ?? 'qty') },
  ]);
  protected readonly shown = signal('first');

  constructor() {
    effect(() => {
      const shown = this.shown();
      untracked(() => this.events.log(`shows ${this.options().find((o) => o.value === shown)?.label}`));
    });
  }
}

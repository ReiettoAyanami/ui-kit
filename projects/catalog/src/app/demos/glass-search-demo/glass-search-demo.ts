import { Component, inject, input, signal } from '@angular/core';
import { LenziGlassSearch } from '@lenzi/ui-kit/backgrounds';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** LenziGlassSearch over stripes of the theme's colours, so its glass has something to bend. */
@Component({
  selector: 'app-glass-search-demo',
  imports: [LenziGlassSearch],
  templateUrl: './glass-search-demo.html',
  styleUrl: './glass-search-demo.css',
})
export class GlassSearchDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);
  protected readonly text = signal('');

  protected searched(text: string): void {
    this.events.log(text ? `searched "${text}"` : 'cleared');
  }
}

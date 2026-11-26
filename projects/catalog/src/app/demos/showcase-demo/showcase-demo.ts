import { Component, computed, inject, input } from '@angular/core';

import { LenziShowcase, LenziShowcaseSlide } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { USAGE_EXAMPLES, UsageExampleView } from '../../shared/usage-example/usage-example';
import { Values } from '../../registry';

/** A showcase of three slides, pieces of the kit in use: they take turns as long as the parameter says. */
@Component({
  selector: 'app-showcase-demo',
  imports: [LenziShowcase, LenziShowcaseSlide, UsageExampleView],
  templateUrl: './showcase-demo.html',
  styleUrl: './showcase-demo.css',
})
export class ShowcaseDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);

  protected readonly slides = USAGE_EXAMPLES.filter((example) => ['stock', 'settings', 'player'].includes(example.kind));
  protected readonly interval = computed(() => Number(this.values()['seconds'] ?? 7) * 1000);

  protected shown(index: number): void {
    this.events.log(`showing ${this.slides[index]?.name}`);
  }
}

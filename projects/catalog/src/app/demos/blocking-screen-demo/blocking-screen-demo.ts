import { Component, computed, inject, input } from '@angular/core';

import { KitBlockingScreen } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

@Component({
  selector: 'app-blocking-screen-demo',
  imports: [KitBlockingScreen],
  templateUrl: './blocking-screen-demo.html',
  styleUrl: './blocking-screen-demo.css',
})
export class BlockingScreenDemo {
  readonly values = input<Values>({});
  protected readonly events = inject(DemoEvents);
  protected readonly kind = computed(() => String(this.values()['kind'] ?? 'flat') as 'flat' | 'stroked');
}

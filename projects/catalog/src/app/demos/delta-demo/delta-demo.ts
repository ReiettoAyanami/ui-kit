import { Component, computed, input } from '@angular/core';

import { KitDelta } from '@lenzi/ui-kit';

import { Values } from '../../registry';

@Component({
  selector: 'app-delta-demo',
  imports: [KitDelta],
  templateUrl: './delta-demo.html',
  styleUrl: './delta-demo.css',
})
export class DeltaDemo {
  readonly values = input<Values>({});
  protected readonly ratio = computed(() => (this.values()['none'] ? null : String(this.values()['ratio'])));
  protected readonly good = computed(() => String(this.values()['good'] ?? 'down') as 'down' | 'up' | 'none');
}

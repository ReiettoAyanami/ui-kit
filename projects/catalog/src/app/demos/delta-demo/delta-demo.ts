import { Component, computed, input } from '@angular/core';

import { LenziDelta } from '@lenzi/ui-kit';

import { Values } from '../../registry';

@Component({
  selector: 'app-delta-demo',
  imports: [LenziDelta],
  templateUrl: './delta-demo.html',
  styleUrl: './delta-demo.css',
})
export class DeltaDemo {
  readonly values = input<Values>({});
  protected readonly ratio = computed(() => (this.values()['none'] ? null : String(this.values()['ratio'])));
  protected readonly good = computed(() => String(this.values()['good'] ?? 'up') as 'down' | 'up' | 'none');
}

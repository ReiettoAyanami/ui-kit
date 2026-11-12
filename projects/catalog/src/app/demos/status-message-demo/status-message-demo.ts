import { Component, computed, input } from '@angular/core';

import { LenziStatusMessage } from '@lenzi/ui-kit';

import { Values } from '../../registry';

@Component({
  selector: 'app-status-message-demo',
  imports: [LenziStatusMessage],
  templateUrl: './status-message-demo.html',
  styleUrl: './status-message-demo.css',
})
export class StatusMessageDemo {
  readonly values = input<Values>({});
  protected readonly kind = computed(() => String(this.values()['kind'] ?? 'empty') as 'loading' | 'empty' | 'error');
}

import { Component, computed, input } from '@angular/core';

import { KitStatusMessage } from '@lenzi/ui-kit';

import { Values } from '../../registry';

@Component({
  selector: 'app-status-message-demo',
  imports: [KitStatusMessage],
  templateUrl: './status-message-demo.html',
  styleUrl: './status-message-demo.css',
})
export class StatusMessageDemo {
  readonly values = input<Values>({});
  protected readonly kind = computed(() => String(this.values()['kind'] ?? 'empty') as 'loading' | 'empty' | 'error');
}

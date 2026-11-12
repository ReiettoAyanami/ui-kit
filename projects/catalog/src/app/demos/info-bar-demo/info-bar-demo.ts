import { Component, computed, inject, input } from '@angular/core';

import { LenziInfoBar } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

@Component({
  selector: 'app-info-bar-demo',
  imports: [LenziInfoBar],
  templateUrl: './info-bar-demo.html',
  styleUrl: './info-bar-demo.css',
})
export class InfoBarDemo {
  readonly values = input<Values>({});
  protected readonly events = inject(DemoEvents);
  protected readonly tone = computed(() => String(this.values()['tone'] ?? 'neutral') as 'neutral' | 'secondary' | 'tertiary');
}

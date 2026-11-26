import { Component, computed, input } from '@angular/core';

import { LenziBento, LenziBentoTile } from '@lenzi/ui-kit';

import { Values } from '../../registry';

/** A bento grid: the first tile as wide and tall as the parameters say, the others around it. */
@Component({
  selector: 'app-bento-demo',
  imports: [LenziBento, LenziBentoTile],
  templateUrl: './bento-demo.html',
  styleUrl: './bento-demo.css',
})
export class BentoDemo {
  readonly values = input<Values>({});

  protected readonly span = computed(() => Number(this.values()['span'] ?? 7));
  protected readonly rows = computed(() => Number(this.values()['rows'] ?? 2));
}

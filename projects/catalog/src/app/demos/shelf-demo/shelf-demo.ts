import { Component, computed, inject, input } from '@angular/core';

import { LenziPreviewCard, LenziShelf, identityColor } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

const SCENES = ['Dusk', 'Harbour', 'Aurora', 'Embers', 'Tide', 'Orchard', 'Lanterns', 'Frost', 'Meadow'];

/** A shelf of nine scenes' cards, each preview a colour: as wide as the parameter says, "Show all" lays them out. */
@Component({
  selector: 'app-shelf-demo',
  imports: [LenziShelf, LenziPreviewCard],
  templateUrl: './shelf-demo.html',
  styleUrl: './shelf-demo.css',
})
export class ShelfDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);

  protected readonly cards = SCENES.map((name, i) => ({ name, color: identityColor(i + 1), lines: [`${3 + (i % 4)} blobs`] }));
  protected readonly width = computed(() => `${Number(this.values()['item'] ?? 280)}px`);

  protected opened(name: string): void {
    this.events.log(`opened ${name}`);
  }

  protected expanded(expanded: boolean): void {
    this.events.log(expanded ? 'all of them' : 'one row');
  }
}

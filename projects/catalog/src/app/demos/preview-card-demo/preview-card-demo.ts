import { Component, computed, inject, input } from '@angular/core';

import { LenziCardMenu, LenziMenuAction, LenziPreviewCard } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/**
 * A few preview cards in a grid: each a picture that moves only while its card is pointed at (or the keyboard is
 * on it), its title, its facts, its ⋮. The first card is the one the parameters change.
 */
@Component({
  selector: 'app-preview-card-demo',
  imports: [LenziCardMenu, LenziPreviewCard],
  templateUrl: './preview-card-demo.html',
  styleUrl: './preview-card-demo.css',
})
export class PreviewCardDemo {
  readonly values = input<Values>({});
  protected readonly events = inject(DemoEvents);

  protected readonly actions: LenziMenuAction[] = [
    { id: 'open', label: 'Open', icon: 'open_in_new' },
    { id: 'delete', label: 'Delete', icon: 'delete', destructive: true },
  ];

  protected readonly cards = computed(() => [
    { title: String(this.values()['title'] ?? 'Dusk'), lines: ['6 blobs, 3 fleets', 'Saved on 15 November 2026'], look: 'dusk' },
    { title: 'A long name that takes two lines and then stops with three dots at its end', lines: ['3 blobs, no fleets', 'Saved on 14 November 2026'], look: 'noon' },
    { title: 'Deep', lines: ['9 blobs, 2 fleets', 'Saved on 12 November 2026'], look: 'deep' },
  ]);
}

import { Component, computed, inject, input, signal } from '@angular/core';

import { KitSearchBar, KitStatusMessage } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

const NAMES = ['Birra', 'Caffè', 'Whisky', 'Sigarette', 'Tè verde', 'Acqua frizzante', 'Peroni 6-pack', 'Capsule Lavazza'];

/** The search bar over a list: it searches once the typing pauses, the ✕ brings everything back. */
@Component({
  selector: 'app-search-bar-demo',
  imports: [KitSearchBar, KitStatusMessage],
  templateUrl: './search-bar-demo.html',
  styleUrl: './search-bar-demo.css',
})
export class SearchBarDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);

  protected readonly query = signal('');
  protected readonly found = computed(() => {
    const words = this.query().toLowerCase();
    return NAMES.filter((name) => name.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').includes(words.normalize('NFD').replace(/\p{M}/gu, '')));
  });

  protected search(text: string): void {
    this.query.set(text);
    this.events.log(text ? `search: ${text}` : 'search cleared');
  }
}

import { Component, computed, inject, input } from '@angular/core';

import { KitNavEntry, KitNavList } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** The navigation list as it stands in an open drawer: tap the pages, the current one follows. */
@Component({
  selector: 'app-nav-list-demo',
  imports: [KitNavList],
  templateUrl: './nav-list-demo.html',
  styleUrl: './nav-list-demo.css',
})
export class NavListDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);

  protected readonly pages: KitNavEntry[] = [
    { label: 'Consumptions', icon: 'history', link: '/frame/nav-list' },
    { label: 'Substances', icon: 'inventory_2', link: '/frame/nav-list/substances' },
    { label: 'Metrics', icon: 'table_chart', link: '/frame/nav-list/metrics' },
    { label: 'Statistics', icon: 'insights', link: '/frame/nav-list/statistics' },
  ];
  protected readonly bottomEntries: KitNavEntry[] = [
    { label: 'Sign out', icon: 'logout', id: 'sign-out' },
    { label: 'Settings', icon: 'settings', link: '/frame/nav-list/settings' },
  ];
  protected readonly bottom = computed(() => (this.values()['bottom'] ? this.bottomEntries : []));

  protected log(text: string): void {
    this.events.log(text);
  }
}

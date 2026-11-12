import { Component, computed, inject, input } from '@angular/core';

import { LenziAppShell, LenziInfoBar, LenziNavEntry, LenziNavList, LenziNotification, LenziNotificationBell } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** A whole shell inside the frame: the drawer opens from the menu button, the page scrolls under the bar. */
@Component({
  selector: 'app-app-shell-demo',
  imports: [LenziAppShell, LenziInfoBar, LenziNavList, LenziNotificationBell],
  templateUrl: './app-shell-demo.html',
  styleUrl: './app-shell-demo.css',
})
export class AppShellDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);

  protected readonly title = computed(() => String(this.values()['title'] ?? ''));
  protected readonly pages: LenziNavEntry[] = [
    { label: 'Consumptions', icon: 'history', link: '/frame/app-shell' },
    { label: 'Substances', icon: 'inventory_2', link: '/frame/app-shell/substances' },
    { label: 'Statistics', icon: 'insights', link: '/frame/app-shell/statistics' },
  ];
  protected readonly bottom: LenziNavEntry[] = [
    { label: 'Sign out', icon: 'logout', id: 'sign-out' },
    { label: 'Settings', icon: 'settings', link: '/frame/app-shell/settings' },
  ];
  protected readonly news: LenziNotification[] = [
    { id: 1, title: 'Printer offline again', meta: 'TT-0107', when: '2 min ago' },
    { id: 2, title: 'New mailbox for the front desk', meta: 'TT-0108', when: '9 min ago' },
  ];
  protected readonly rows = Array.from({ length: 14 }, (_, i) => i + 1);

  protected log(text: string): void {
    this.events.log(text);
  }
}

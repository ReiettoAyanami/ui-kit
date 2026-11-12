import { Component, computed, inject, input } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';

import { KitNotification, KitNotificationBell } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

const TITLES = ['Printer offline again', 'New mailbox for the front desk', 'VPN drops every hour', 'Badge reader at the door', 'Laptop for the new colleague', 'Backup failed on the NAS', 'Phone line noisy', 'Licence renewal'];

@Component({
  selector: 'app-notification-bell-demo',
  imports: [KitNotificationBell, MatToolbarModule],
  templateUrl: './notification-bell-demo.html',
  styleUrl: './notification-bell-demo.css',
})
export class NotificationBellDemo {
  readonly values = input<Values>({});
  protected readonly events = inject(DemoEvents);

  protected readonly items = computed<KitNotification[]>(() =>
    TITLES.slice(0, Number(this.values()['count'] ?? 3)).map((title, i) => ({ id: i + 1, title, meta: `TT-0${101 + i}`, when: `${(i + 1) * 4} min ago` })),
  );
}

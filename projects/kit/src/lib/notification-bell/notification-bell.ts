import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';

/** One thing that arrived. */
export interface KitNotification {
  id: string | number;
  /** What it is: a ticket's title. Up to two lines. */
  title: string;
  /** Above the title, at the left: its number, its sender. */
  meta?: string;
  /** Above the title, at the right: when it arrived, formatted ("2 min ago"). */
  when?: string;
  /** Where a tap goes (a router link); without one, a tap says `selected`. */
  link?: string | readonly unknown[];
}

/**
 * The bell in the top bar (RULES.md, "Notifications"; vtiger-reader `ui/bell`): a count of what
 * arrived since the user last looked, a menu of it when opened, a tap opens one. What it lists is
 * kept as it was when it opened, so it does not change under the finger while the page marks it
 * seen. The page loads, marks seen (`opened`) and hides the bell when notifications are off.
 * Put it in the shell's top bar (`kitShellActions`).
 */
@Component({
  selector: 'kit-notification-bell',
  imports: [MatBadgeModule, MatButtonModule, MatIconModule, MatMenuModule, NgTemplateOutlet, RouterLink],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class KitNotificationBell {
  /** What arrived since the user last looked, newest first. */
  readonly items = input.required<readonly KitNotification[]>();
  /** What the things are called, for the accessible name: "3 new tickets", "No new tickets". */
  readonly noun = input('notifications');
  /** What the open menu says when nothing arrived. */
  readonly emptyText = input('Nothing new.');
  /** The menu was opened: the page marks what it showed as seen. */
  readonly opened = output<readonly KitNotification[]>();
  /** An item without a link was tapped. */
  readonly selected = output<KitNotification>();

  protected readonly count = computed(() => this.items().length);
  protected readonly ariaLabel = computed(() => (this.count() ? `${this.count()} new ${this.noun()}` : `No new ${this.noun()}`));

  /** What the open menu shows: the items as they were when it opened. */
  protected readonly shown = signal<readonly KitNotification[]>([]);

  protected open(): void {
    const items = this.items();
    this.shown.set(items);
    this.opened.emit(items);
  }
}

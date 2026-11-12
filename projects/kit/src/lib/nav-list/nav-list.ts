import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';

import { LenziAppShell } from '../app-shell/app-shell';

/** One entry of the drawer: a page (a link), or an action (a button: Sign out). */
export interface LenziNavEntry {
  /** Whole words: "Consumptions", "Sign out". */
  label: string;
  /** A Material icon name: "history", "settings". */
  icon: string;
  /** The page's router link; without one the entry is a button and says `pressed` with its id. */
  link?: string | readonly unknown[];
  /** Highlighted on its exact address only (a start page); by default also on its child routes. The root ('' or '/') is exact. */
  exact?: boolean;
  /** Which action a button entry is (`pressed`); for a link, its track key (the link when not given). */
  id?: string;
}

const EXACT: IsActiveMatchOptions = { paths: 'exact', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' };
const SUBTREE: IsActiveMatchOptions = { paths: 'subset', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' };

/**
 * The navigation between the pages (RULES.md, "App shell"; substance-tracker and vtiger-reader
 * `sidebar`): the app's name at the top (and under it who is signed in), one link per page with its
 * icon, the current one highlighted, also on a child route; at the bottom, apart from the pages, the
 * rest (settings, Sign out). Links only, no data. Inside a LenziAppShell (`lenziShellNav`) a tap on a
 * link closes the drawer.
 */
@Component({
  selector: 'lenzi-nav-list',
  imports: [MatIconModule, MatListModule, NgTemplateOutlet, RouterLink, RouterLinkActive],
  templateUrl: './nav-list.html',
  styleUrl: './nav-list.css',
})
export class LenziNavList {
  /** The app's name, at the top: "Substance tracker". */
  readonly appName = input.required<string>();
  /** Under the name: who is signed in. */
  readonly subtitle = input<string | null>(null);
  /** The pages. */
  readonly pages = input.required<readonly LenziNavEntry[]>();
  /** At the bottom, apart from the pages: Settings, Sign out. */
  readonly bottom = input<readonly LenziNavEntry[]>([]);
  /** The navigation's accessible name. */
  readonly label = input('Pages');

  /** A link was tapped. */
  readonly navigated = output<LenziNavEntry>();
  /** A button entry (no link) was tapped: its id. */
  readonly pressed = output<string>();

  private readonly shell = inject(LenziAppShell, { optional: true });

  protected match(entry: LenziNavEntry): IsActiveMatchOptions {
    const exact = entry.exact ?? (entry.link === '' || entry.link === '/');
    return exact ? EXACT : SUBTREE;
  }

  protected key(entry: LenziNavEntry): string {
    return entry.id ?? JSON.stringify(entry.link ?? entry.label);
  }

  protected follow(entry: LenziNavEntry): void {
    this.shell?.closeNav();
    this.navigated.emit(entry);
  }

  protected press(entry: LenziNavEntry): void {
    this.pressed.emit(entry.id ?? entry.label);
  }
}

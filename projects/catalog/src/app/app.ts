import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { KitAppShell, KitNavEntry, KitNavList, KitVersionLabel } from '@lenzi/ui-kit';

import kitPackage from '../../../kit/package.json';
import { LiveTokens } from './shared/live-tokens';

/**
 * The catalog of the kit, built with the kit: its shell and drawer, its version in the corner. The
 * drawer holds links only: the pages of the catalog, the components are listed on their own page.
 */
@Component({
  selector: 'app-root',
  imports: [KitAppShell, KitNavList, KitVersionLabel, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly version = kitPackage.version;

  protected readonly pages: KitNavEntry[] = [
    { label: 'Overview', icon: 'home', link: '/' },
    { label: 'Components', icon: 'widgets', link: '/components' },
    { label: 'Rules', icon: 'rule', link: '/rules' },
    { label: 'AI rules', icon: 'smart_toy', link: '/ai-rules' },
    { label: 'Variables', icon: 'tune', link: '/variables' },
    { label: 'Libraries', icon: 'inventory_2', link: '/libraries' },
  ];

  constructor() {
    // The variables changed and not saved yet apply from the first page.
    inject(LiveTokens);
  }
}

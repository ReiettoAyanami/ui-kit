import { Component, inject, input } from '@angular/core';
import { LenziNavEntry } from '@lenzi/ui-kit';
import { LenziGlassTabBar } from '@lenzi/ui-kit/backgrounds';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** LenziGlassTabBar over stripes of the theme's colours: its tabs go to pages of the frame. */
@Component({
  selector: 'app-glass-tab-bar-demo',
  imports: [LenziGlassTabBar],
  templateUrl: './glass-tab-bar-demo.html',
  styleUrl: './glass-tab-bar-demo.css',
})
export class GlassTabBarDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);

  protected readonly pages: LenziNavEntry[] = [
    { label: 'Overview', icon: 'home', link: '/frame/glass-tab-bar' },
    { label: 'Components', icon: 'widgets', link: '/frame/glass-tab-bar/components' },
    { label: 'Scenes', icon: 'landscape', link: '/frame/glass-tab-bar/scenes' },
  ];
  protected readonly bottom: LenziNavEntry[] = [{ label: 'Admin', icon: 'admin_panel_settings', link: '/frame/glass-tab-bar/admin' }];

  protected log(text: string): void {
    this.events.log(text);
  }
}

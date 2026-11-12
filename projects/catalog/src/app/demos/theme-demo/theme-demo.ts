import { Component, computed, input } from '@angular/core';

import { LenziFigure } from '@lenzi/ui-kit';

import { Values } from '../../registry';

const ROLES = [
  'primary',
  'on-primary',
  'primary-container',
  'on-primary-container',
  'secondary',
  'secondary-container',
  'tertiary',
  'tertiary-container',
  'error',
  'surface',
  'surface-container-lowest',
  'surface-container-low',
  'surface-container',
  'surface-container-high',
  'surface-container-highest',
  'on-surface',
  'on-surface-variant',
  'outline',
  'outline-variant',
];

const TYPE = ['display-small', 'headline-medium', 'headline-small', 'title-large', 'title-medium', 'body-large', 'body-medium', 'body-small', 'label-large', 'label-medium'];

/** The theme's colour roles, each with its value as the page has it now, and the type scale. */
@Component({
  selector: 'app-theme-demo',
  imports: [LenziFigure],
  templateUrl: './theme-demo.html',
  styleUrl: './theme-demo.css',
})
export class ThemeDemo {
  readonly values = input<Values>({});
  protected readonly show = computed(() => String(this.values()['show'] ?? 'colours'));

  protected readonly roles = ROLES.map((role) => ({ role, variable: `--mat-sys-${role}` }));
  protected readonly statuses = ['--lenzi-status-good', '--lenzi-status-bad'];
  protected readonly type = TYPE;

  protected valueOf(variable: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  }
}

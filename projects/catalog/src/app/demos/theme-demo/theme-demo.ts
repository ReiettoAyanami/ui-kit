import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { LenziColorPicker, LenziFigure } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { LiveTokens } from '../../shared/live-tokens';
import { TokensApi } from '../../shared/tokens-api';
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

/**
 * The theme's colour roles and the type scale. Every colour is its picker (LenziColorPicker): a click
 * opens the selector and the colour changes at once, everywhere (it is a global variable); it is
 * saved from the Variables tab or page.
 */
@Component({
  selector: 'app-theme-demo',
  imports: [LenziColorPicker, LenziFigure],
  templateUrl: './theme-demo.html',
  styleUrl: './theme-demo.css',
})
export class ThemeDemo {
  readonly values = input<Values>({});
  protected readonly show = computed(() => String(this.values()['show'] ?? 'colours'));

  private readonly live = inject(LiveTokens);
  private readonly events = inject(DemoEvents);
  private readonly tokensApi = inject(TokensApi);
  private readonly saved = rxResource({ stream: () => this.tokensApi.load() });

  protected readonly roles = [...ROLES.map((role) => ({ name: role, variable: `--mat-sys-${role}` })), { name: 'status-good', variable: '--lenzi-status-good' }, { name: 'status-bad', variable: '--lenzi-status-bad' }];
  protected readonly type = TYPE;

  /** Each role's colour as the page has it now: read again whenever a variable changes. */
  protected readonly colours = computed(() => {
    this.live.overrides();
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(this.roles.map((role) => [role.variable, style.getPropertyValue(role.variable).trim()]));
  });

  /** While the selector moves: the variable follows; back on its saved value, it is no change any more. */
  protected apply(variable: string, hex: string): void {
    const saved = this.saved.hasValue() ? this.saved.value().groups.flatMap((group) => group.tokens).find((token) => token.name === variable)?.value : undefined;
    if (saved !== undefined && saved.toLowerCase() === hex.toLowerCase()) this.live.reset(variable);
    else this.live.set(variable, hex);
  }

  /** The selector closed with another colour. */
  protected picked(name: string, hex: string): void {
    this.events.log(`${name}: ${hex}, applied everywhere (save it from the Variables tab)`);
  }
}

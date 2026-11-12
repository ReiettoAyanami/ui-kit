import { Component, DOCUMENT, DestroyRef, effect, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { of } from 'rxjs';

import { KitConfirmData, KitConfirmDialog, KitDialogs } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** The real windows and panels, in this frame's glass: open them over the pattern to see it. */
@Component({
  selector: 'app-glass-motion-demo',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  templateUrl: './glass-motion-demo.html',
  styleUrl: './glass-motion-demo.css',
})
export class GlassMotionDemo {
  readonly values = input<Values>({});

  private readonly dialogs = inject(KitDialogs);
  private readonly snackBar = inject(MatSnackBar);
  private readonly events = inject(DemoEvents);

  constructor() {
    const root = inject(DOCUMENT).documentElement;
    effect(() => {
      const values = this.values();
      root.classList.toggle('reduce-transparency', values['reduce'] === true);
      root.style.setProperty('--kit-glass', `${values['glass'] ?? 56}%`);
      root.style.setProperty('--kit-glass-blur', `${values['blur'] ?? 24}px`);
    });
    inject(DestroyRef).onDestroy(() => {
      root.classList.remove('reduce-transparency');
      root.style.removeProperty('--kit-glass');
      root.style.removeProperty('--kit-glass-blur');
    });
  }

  protected async openWindow(): Promise<void> {
    const closed = await this.dialogs.open<KitConfirmDialog, KitConfirmData, true>(KitConfirmDialog, {
      title: 'A window in glass',
      message: 'Full size from the first frame: it rises into place, its content fades in. Close it with the back button too.',
      confirm: 'Close',
      destructive: false,
      action: () => of(true),
    });
    this.events.log(closed ? 'window closed with its button' : 'window closed');
  }

  protected snack(): void {
    this.snackBar.open('A snackbar: it rises as far as a window', 'OK', { duration: 3000 });
    this.events.log('snackbar');
  }
}

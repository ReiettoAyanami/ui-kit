import { Component, computed, inject, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { LenziCardMenu, LenziIdentityDot, LenziMenuAction } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** A card that opens on a tap, its ⋮ at the top right: the menu's taps never open the card. */
@Component({
  selector: 'app-card-menu-demo',
  imports: [LenziCardMenu, LenziIdentityDot, MatCardModule],
  templateUrl: './card-menu-demo.html',
  styleUrl: './card-menu-demo.css',
})
export class CardMenuDemo {
  readonly values = input<Values>({});
  protected readonly events = inject(DemoEvents);

  protected readonly actions = computed<LenziMenuAction[]>(() => [
    { id: 'details', label: 'Details', icon: 'info' },
    { id: 'edit', label: 'Edit', icon: 'edit' },
    ...(this.values()['delete'] ? [{ id: 'delete', label: 'Delete', icon: 'delete', destructive: true }] : []),
  ]);
}

import { Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { LenziBackground, LenziBlobBackground, LenziGlassPage, LenziLit, lenziOverBackground } from '@lenzi/ui-kit/backgrounds';

import { Values } from '../../registry';

/**
 * A page over a background: the glass pane behind its elements and its cards lit, while the kit sees a background
 * behind the page; with nothing behind, the page as it is, cards solid.
 */
@Component({
  selector: 'app-glass-page-demo',
  imports: [LenziBackground, LenziBlobBackground, LenziGlassPage, LenziLit, MatCardModule],
  templateUrl: './glass-page-demo.html',
  styleUrl: './glass-page-demo.css',
})
export class GlassPageDemo {
  readonly values = input<Values>({});

  protected readonly behind = computed(() => String(this.values()['behind'] ?? 'blobs'));
  protected readonly lit = lenziOverBackground();
}

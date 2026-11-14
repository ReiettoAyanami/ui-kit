import { CdkDrag } from '@angular/cdk/drag-drop';
import { Component, computed, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { LenziBackground, LenziBlobBackground, LenziFlockBackground, LenziGlow, LenziLit } from '@lenzi/ui-kit/backgrounds';
import { LenziCat, LenziCatBack, LenziCatExpression, LenziCatMaterial } from '@lenzi/ui-kit/svgs';

import { Values } from '../../registry';

/**
 * lenzi's cat on a dark floor (2026-11-14: "fammi una pagina dove posso vedere gli effetti dei materiali
 * sulle varie icone", then "only one cat and make me choose what expression and what back to use"): one
 * cat, its expression, back and material chosen from the parameters, and a bulb to light it. Both are moved
 * by dragging: the bulb lights the cat, a solid cat casts its shadow on the floor, a lamp cat lights the bulb.
 */
@Component({
  selector: 'app-cat-demo',
  imports: [CdkDrag, LenziBackground, LenziBlobBackground, LenziCat, LenziFlockBackground, LenziGlow, LenziLit, MatButtonModule, MatIconModule],
  templateUrl: './cat-demo.html',
  styleUrl: './cat-demo.css',
})
export class CatDemo {
  readonly values = input<Values>({});

  protected readonly expression = computed(() => String(this.values()['expression'] ?? 'happy') as LenziCatExpression);
  protected readonly back = computed(() => String(this.values()['back'] ?? 'plain') as LenziCatBack);
  protected readonly material = computed(() => String(this.values()['material'] ?? 'solid') as LenziCatMaterial);
  protected readonly color = computed(() => String(this.values()['color'] ?? '#b388ff'));
  protected readonly size = computed(() => this.num('size', 160));
  protected readonly animated = computed(() => this.values()['animated'] !== false);
  protected readonly strength = computed(() => this.num('strength', 1));
  protected readonly reach = computed(() => this.num('reach', 220));
  protected readonly behind = computed(() => String(this.values()['behind'] ?? 'dark'));

  /** The bulb, on or off (a tap switches it). */
  protected readonly bulb = signal(true);
  private droppedAt = 0;

  protected dropped(): void {
    this.droppedAt = performance.now();
  }

  /** The click that ends a drag is not a tap. */
  protected tapped(): void {
    if (performance.now() - this.droppedAt > 250) this.bulb.update((on) => !on);
  }

  private num(key: string, otherwise: number): number {
    const value = Number(this.values()[key] ?? otherwise);
    return Number.isFinite(value) ? value : otherwise;
  }
}

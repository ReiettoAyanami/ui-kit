import { Component, ElementRef, OnDestroy, input, model, output, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { LIQUID_GLASS_SETTINGS } from '../../liquid-glass/liquid-surface';
import { glassLens } from '../lens';

/** The pause after typing before a search, ms (the kit's search bar's). */
const PAUSE = 300;

/**
 * A search field the way Apple's is in its new design (lenzi, 2026-11-25: "implementa ... searchbar nel kit come quelli
 * di apple"): a capsule of Liquid Glass with a magnifier and what it looks for inside it; it searches as you type (300 ms
 * pause) and an ✕ clears it, as the kit's search bar does. The page keeps the text (the URL) and gives it back.
 */
@Component({
  selector: 'lenzi-glass-search',
  imports: [MatIconModule],
  templateUrl: './glass-search.html',
  styleUrl: './glass-search.css',
})
export class LenziGlassSearch implements OnDestroy {
  /** The text: `[(value)]`, given back by the page. */
  readonly value = model('');
  /** What it searches, inside it: "Search shifts". */
  readonly placeholder = input.required<string>();
  /** The text once typing paused (and at once when cleared). */
  readonly search = output<string>();

  private readonly field = viewChild.required<ElementRef<HTMLElement>>('field');
  private pause: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // kube.io's search box (a convex bezel, blur 1, specular 0.2 and 4), thicker and bending more (thickness 44 and
    // refraction 1.2, kube.io's 30 and 0.7; its edge's line all round, specular 0.5: lenzi, 2026-11-26: "configura gli elementi più piccoli per fare in modo che l'effetto liquidglass si veda meglio, come lo slider, toggle ecc."); all of its bending, always.
    glassLens(
      () => this.field().nativeElement,
      { ...LIQUID_GLASS_SETTINGS, surface: 'squircle', bezel: 14, thickness: 44, refraction: 1.2, blur: 1, specularOpacity: 0.5, specularSaturation: 4, lightBase: 0.45 },
      1,
    );
  }

  protected typed(text: string): void {
    this.value.set(text);
    if (this.pause) clearTimeout(this.pause);
    this.pause = setTimeout(() => this.search.emit(text), PAUSE);
  }

  protected clear(input: HTMLInputElement): void {
    if (this.pause) clearTimeout(this.pause);
    this.value.set('');
    this.search.emit('');
    input.focus();
  }

  ngOnDestroy(): void {
    if (this.pause) clearTimeout(this.pause);
  }
}

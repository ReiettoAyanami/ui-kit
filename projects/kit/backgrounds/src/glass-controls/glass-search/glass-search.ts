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
    // A field is a larger control than a thumb: a squircle bezel, the default optics.
    glassLens(() => this.field().nativeElement, { ...LIQUID_GLASS_SETTINGS, bezel: 14, thickness: 30, rim: 0.5, pointerReach: 0 });
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

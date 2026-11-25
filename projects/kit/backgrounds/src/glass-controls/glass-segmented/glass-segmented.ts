import { Component, ElementRef, booleanAttribute, computed, input, model, signal, viewChild } from '@angular/core';

import { glassLens } from '../lens';

/** One choice of a segmented control. */
export interface LenziGlassOption<T = string> {
  value: T;
  /** Whole words. */
  label: string;
}

/** How long the pill stays glass on its way to the next choice, ms. */
const SETTLE = 380;

/**
 * Two or more choices side by side, one chosen, the way Apple's segmented control and switch move (lenzi, 2026-11-25:
 * "fammi un selettore triplo con animazione simile/uguale a questo switch. Quindi quando clicchi va alla prossima opzione
 * diventando vetro"): the chosen one sits on a light capsule; a tap on another moves the capsule there, a tap on the
 * chosen one moves it to the next (round to the first); on its way the capsule is Liquid Glass, larger, bending the words
 * under it, and settles solid. The arrow keys move it too.
 */
@Component({
  selector: 'lenzi-glass-segmented',
  imports: [],
  templateUrl: './glass-segmented.html',
  styleUrl: './glass-segmented.css',
})
export class LenziGlassSegmented<T = string> {
  readonly options = input.required<readonly LenziGlassOption<T>[]>();
  /** The chosen value: `[(value)]`. */
  readonly value = model<T | null>(null);
  /** What is chosen, for a screen reader. */
  readonly label = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  /** On its way: the pill is glass. */
  protected readonly moving = signal(false);
  protected readonly index = computed(() => Math.max(0, this.options().findIndex((o) => o.value === this.value())));

  private readonly lens = viewChild.required<ElementRef<HTMLElement>>('lens');
  private settle: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    glassLens(() => this.lens().nativeElement);
  }

  /** A tap: another choice, or the next one after the chosen. */
  protected pick(i: number): void {
    if (this.disabled()) return;
    const count = this.options().length;
    this.go(i === this.index() ? (i + 1) % count : i);
  }

  protected key(event: KeyboardEvent): void {
    const count = this.options().length;
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step || this.disabled()) return;
    event.preventDefault();
    this.go((this.index() + step + count) % count);
  }

  private go(i: number): void {
    const option = this.options()[i];
    if (!option) return;
    if (this.settle) clearTimeout(this.settle);
    this.moving.set(true);
    this.value.set(option.value);
    this.settle = setTimeout(() => this.moving.set(false), SETTLE);
  }
}

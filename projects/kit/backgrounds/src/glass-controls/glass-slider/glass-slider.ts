import { Component, ElementRef, booleanAttribute, computed, input, model, numberAttribute, signal, viewChild } from '@angular/core';

import { glassLens } from '../lens';

/** How long the thumb stays glass after it is let go, ms. */
const SETTLE = 260;

/**
 * A slider the way Apple's is (lenzi, 2026-11-25: "implementa gli slider ... nel kit come quelli di apple"): a thin
 * capsule track filled with the accent up to the value, a light capsule thumb that becomes Liquid Glass while it is
 * dragged, larger, magnifying the track under it, and settles solid. A tap on the track jumps there; the arrow keys step,
 * Page Up/Down by ten steps, Home and End to the ends.
 */
@Component({
  selector: 'lenzi-glass-slider',
  imports: [],
  templateUrl: './glass-slider.html',
  styleUrl: './glass-slider.css',
})
export class LenziGlassSlider {
  /** The value: `[(value)]`. */
  readonly value = model(0);
  readonly min = input(0, { transform: numberAttribute });
  readonly max = input(100, { transform: numberAttribute });
  readonly step = input(1, { transform: numberAttribute });
  /** What it sets, for a screen reader. */
  readonly label = input.required<string>();
  /** How the value reads aloud ("40 %"); the number by default. */
  readonly valueText = input<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly active = signal(false);
  protected readonly dragging = signal(false);
  /** Where the value is along the track, 0 to 1. */
  protected readonly fraction = computed(() => {
    const span = this.max() - this.min();
    return span > 0 ? Math.min(1, Math.max(0, (this.value() - this.min()) / span)) : 0;
  });

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly lens = viewChild.required<ElementRef<HTMLElement>>('lens');
  private settle: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    glassLens(() => this.lens().nativeElement);
  }

  protected down(event: PointerEvent): void {
    if (this.disabled() || event.button !== 0) return;
    // Keep the pointer's moves while it is held (a pointer the browser does not know, a test's or a probe's, is let be).
    try {
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    } catch {
      /* not a live pointer */
    }
    if (this.settle) clearTimeout(this.settle);
    this.active.set(true);
    this.dragging.set(true);
    this.setFrom(event.clientX);
  }

  protected move(event: PointerEvent): void {
    if (this.dragging()) this.setFrom(event.clientX);
  }

  protected up(): void {
    if (!this.dragging()) return;
    this.dragging.set(false);
    this.letGo();
  }

  protected key(event: KeyboardEvent): void {
    if (this.disabled()) return;
    const step = this.step();
    const moves: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: step * 10,
      PageDown: -step * 10,
      Home: -Infinity,
      End: Infinity,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    this.set(this.value() + moves[event.key]!);
  }

  /** The value at a point of the screen. */
  private setFrom(x: number): void {
    const box = this.track().nativeElement.getBoundingClientRect();
    const fraction = box.width > 0 ? (x - box.left) / box.width : 0;
    this.set(this.min() + fraction * (this.max() - this.min()));
  }

  /** A value on a step, inside the ends. */
  private set(raw: number): void {
    const step = this.step() > 0 ? this.step() : 1;
    const stepped = this.min() + Math.round((raw - this.min()) / step) * step;
    const value = Math.min(this.max(), Math.max(this.min(), Number(stepped.toFixed(10))));
    if (value !== this.value()) this.value.set(value);
  }

  private letGo(): void {
    if (this.settle) clearTimeout(this.settle);
    this.settle = setTimeout(() => this.active.set(false), SETTLE);
  }
}

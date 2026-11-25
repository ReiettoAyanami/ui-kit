import { Component, ElementRef, booleanAttribute, computed, input, model, numberAttribute, signal, viewChild } from '@angular/core';

import { LENS_BENDING, LENS_SETTINGS, glassLens } from '../lens';

/** The wave's line, px. */
const WAVE_STROKE = 4;

/** How long the thumb stays glass after it is let go, ms. */
const SETTLE = 260;

/** A thumb's shape: a lying capsule (Apple's), a circle, or an upright bar (Android's). */
export type LenziSliderThumb = 'capsule' | 'circle' | 'bar';

/** kube.io's slider's glass: a convex bezel, specular 0.4 and 7, no blur. */
const SLIDER_GLASS = { ...LENS_SETTINGS, surface: 'squircle' as const, bezel: 12, thickness: 18, blur: 0, specularOpacity: 0.4, specularSaturation: 7 };

/**
 * A slider the way Apple's is, built as kube.io's (lenzi, 2026-11-25: "implementa gli slider ... nel kit come quelli di
 * apple"): a thin capsule rail filled with the accent up to the value; a solid thumb that, dragged, gives way to a larger
 * thumb of Liquid Glass (you see the rail and its fill through it, its sides bending what is around); let go, it is solid
 * again. Both shapes are the page's to choose (lenzi: "la forma dei knob dovrebbe essere configurabile, sia quello di
 * vetro nell'animazione che quello che poi è solido"), and the fill may be a wave, Android's music player's ("una barra
 * ondulata come su android per la musica"). A tap on the rail jumps there; the arrow keys step, Page Up/Down by ten
 * steps, Home and End to the ends.
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
  /** The solid thumb's shape. */
  readonly thumb = input<LenziSliderThumb>('capsule');
  /** The glass thumb's shape, while it is dragged. */
  readonly lens = input<LenziSliderThumb>('capsule');
  /** The rail: a line, or the fill as a wave (Android's music player). */
  readonly track = input<'line' | 'wave'>('line');
  /** The wave's height above and below its middle, px. */
  readonly waveAmplitude = input(3, { transform: numberAttribute });
  /** One wave's length, px. */
  readonly waveLength = input(28, { transform: numberAttribute });
  /** The wave flows along (as music plays); false: still. */
  readonly waveMoving = input(true, { transform: booleanAttribute });

  /** The wave's line, 4 px thick, as a mask of one length (the fill shows through it, repeated along). */
  protected readonly waveMask = computed(() => {
    const length = Math.max(8, this.waveLength());
    const amplitude = Math.max(0, this.waveAmplitude());
    const height = 2 * amplitude + WAVE_STROKE;
    const middle = height / 2;
    // a quadratic curve reaches half its control point's height: the control at twice the amplitude
    const path = `M0 ${middle} Q${length / 4} ${middle - 2 * amplitude} ${length / 2} ${middle} T${length} ${middle}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${length}" height="${height}" viewBox="0 0 ${length} ${height}"><path d="${path}" fill="none" stroke="black" stroke-width="${WAVE_STROKE}" stroke-linecap="round"/></svg>`;
    return { image: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, length, height };
  });

  protected readonly active = signal(false);
  protected readonly dragging = signal(false);
  /** Where the value is along the track, 0 to 1. */
  protected readonly fraction = computed(() => {
    const span = this.max() - this.min();
    return span > 0 ? Math.min(1, Math.max(0, (this.value() - this.min()) / span)) : 0;
  });

  private readonly rail = viewChild.required<ElementRef<HTMLElement>>('rail');
  private readonly glass = viewChild.required<ElementRef<HTMLElement>>('glass');
  private settle: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    glassLens(() => this.glass().nativeElement, SLIDER_GLASS, LENS_BENDING.held);
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
    const box = this.rail().nativeElement.getBoundingClientRect();
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

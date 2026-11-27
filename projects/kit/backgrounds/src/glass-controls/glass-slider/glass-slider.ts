import { Component, ElementRef, booleanAttribute, computed, contentChild, effect, input, model, numberAttribute, signal, viewChild } from '@angular/core';

import { LenziGlassKnob, LenziKnobShape } from '../glass-knob/glass-knob';

/** The wave's line, px. */
const WAVE_STROKE = 4;

/** How long the thumb stays glass after it is let go, ms. */
const SETTLE = 260;

/**
 * Dragged past an end, the thumb follows less and less, like a rubber band, never further than this share of its glass's
 * width; let go, it springs back to the end (lenzi, 2026-11-26: "anche le barre di scorrimento devono avere il
 * comportamento a molla", as the switch's thumb).
 */
export const SLIDER_OVERSHOOT = 0.4;

/** A thumb's shape: a lying capsule (Apple's), a circle, an upright bar (Android's), or a blob's (`LenziKnobShape`). */
export type LenziSliderThumb = LenziKnobShape;


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
  imports: [LenziGlassKnob],
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
  /** How far past an end the thumb is pulled now, px (the rubber band; 0 within the ends, and once let go). */
  protected readonly over = signal(0);
  /** Where the value is along the track, 0 to 1. */
  protected readonly fraction = computed(() => {
    const span = this.max() - this.min();
    return span > 0 ? Math.min(1, Math.max(0, (this.value() - this.min()) / span)) : 0;
  });

  /** The rail itself (inside the track's room for its thumbs): where the values lie. */
  private readonly line = viewChild.required<ElementRef<HTMLElement>>('line');
  /** The knob the page gives (`<lenzi-glass-knob>` as its content), or its own. */
  private readonly given = contentChild(LenziGlassKnob);
  private readonly own = viewChild(LenziGlassKnob);
  protected readonly hasKnob = computed(() => !!this.given());
  private readonly knob = computed(() => this.given() ?? this.own() ?? null);
  /** Room at its ends for its knob's lens, px: half of it. */
  protected readonly room = computed(() => (this.knob()?.lensSize().width ?? 0) / 2);
  /** Its knob's width at rest, px: the line's fill reaches almost to its far end. */
  protected readonly knobWidth = computed(() => this.knob()?.size().width ?? 0);
  protected readonly focused = signal(false);
  private settle: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // its knob is held while it is active (dragged, and a moment after), and shows the focus ring with the slider's
    effect(() => this.knob()?.held.set(this.active()));
    effect(() => this.knob()?.focused.set(this.focused()));
  }

  protected down(event: PointerEvent): void {
    if (this.disabled() || event.button !== 0) return;
    // no text selection and no drag of the browser's own while it is dragged (either takes the pointer away: lenzi,
    // 2026-11-26, "quando dragghi (spesso tornando indietro) il dragging si disabilita del tutto"); the focus still comes
    event.preventDefault();
    (event.currentTarget as HTMLElement).focus?.({ preventScroll: true });
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
    if (!this.dragging()) return;
    // let go where it could not tell (outside the window, a frame): the button is up, so is the drag
    if (event.pointerType === 'mouse' && event.buttons === 0) return this.up();
    this.setFrom(event.clientX);
  }

  protected up(): void {
    if (!this.dragging()) return;
    this.dragging.set(false);
    // back to the end, as a spring (the thumbs' transition)
    this.over.set(0);
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

  /** The value at a point of the screen; past an end, the value stays at it and the thumb stretches (a rubber band). */
  private setFrom(x: number): void {
    const box = this.line().nativeElement.getBoundingClientRect();
    const fraction = box.width > 0 ? (x - box.left) / box.width : 0;
    this.set(this.min() + fraction * (this.max() - this.min()));
    const past = (fraction < 0 ? fraction : fraction > 1 ? fraction - 1 : 0) * box.width;
    const most = Math.max(1, (this.knob()?.lensSize().width || 40) * SLIDER_OVERSHOOT);
    this.over.set(Math.sign(past) * most * (1 - Math.exp(-Math.abs(past) / most)));
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

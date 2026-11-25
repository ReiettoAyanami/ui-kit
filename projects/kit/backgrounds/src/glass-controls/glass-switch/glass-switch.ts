import { Component, ElementRef, booleanAttribute, effect, input, model, signal, viewChild } from '@angular/core';

import { LENS_BENDING, glassLens } from '../lens';

/** How long the thumb stays glass after it is let go, ms: the time of its way to the other side. */
const SETTLE = 320;

/** The thumb's size against the track's height, at rest its scale (kube.io's switch: 146 by 92 on a 67 high track). */
const THUMB_WIDTH = 146 / 67;
const REST = 0.65;
/** The gap at each end, against the track's height (kube.io's: 3.6 on 67). */
const INSET = 3.6 / 67;

/**
 * An on/off switch the way Apple's is, built as kube.io's (lenzi, 2026-11-25: "implementa gli slider/toggle/searchbar
 * nel kit come quelli di apple"; read from kube.io's code): a capsule track, the accent when on; one thumb that is
 * always Liquid Glass (a lip bezel) under a white fill. Held, the fill goes to 10%, the thumb grows (0.65 to 0.9) and
 * bends more (0.4 to 0.9): it is glass, bending the track under it; it follows the pointer, stretching a little past the
 * ends, and settles white on its side. A tap switches it; a drag puts it where it is let go; a click (Space and Enter, a screen reader) switches it.
 */
@Component({
  selector: 'lenzi-glass-switch',
  imports: [],
  templateUrl: './glass-switch.html',
  styleUrl: './glass-switch.css',
})
export class LenziGlassSwitch {
  /** On or off: `[(checked)]`. */
  readonly checked = model(false);
  /** What it switches, for a screen reader (and shown beside it when there is no text of the page's). */
  readonly label = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Held: the thumb is glass. */
  protected readonly active = signal(false);
  /** Where the thumb is while it is dragged, 0 (off) to 1 (on); null when it is not. */
  protected readonly dragAt = signal<number | null>(null);

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly thumb = viewChild.required<ElementRef<HTMLElement>>('thumb');
  private start: { x: number; at: number } | null = null;
  private moved = false;
  /** A pointer switched it: the click it brings is not another switch. */
  private tapped = false;
  private settle: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const lens = glassLens(() => this.thumb().nativeElement);
    effect(() => lens.bending(this.active() ? LENS_BENDING.held : LENS_BENDING.rest));
  }

  /** Where the thumb is drawn, 0 to 1. */
  protected position(): number {
    return this.dragAt() ?? (this.checked() ? 1 : 0);
  }

  protected down(event: PointerEvent): void {
    if (this.disabled() || event.button !== 0) return;
    // Keep the pointer's moves while it is held (a pointer the browser does not know, a test's or a probe's, is let be).
    try {
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    } catch {
      /* not a live pointer */
    }
    this.start = { x: event.clientX, at: this.checked() ? 1 : 0 };
    this.moved = false;
    this.hold();
  }

  protected move(event: PointerEvent): void {
    if (!this.start) return;
    const travel = this.travel();
    const dx = event.clientX - this.start.x;
    if (Math.abs(dx) > 3) this.moved = true;
    if (!this.moved) return;
    // past an end it stretches a little (kube.io's: a 22nd of the way past)
    const at = this.start.at + dx / Math.max(1, travel);
    const past = at < 0 ? at : at > 1 ? at - 1 : 0;
    this.dragAt.set(Math.min(1, Math.max(0, at)) + past / 22);
  }

  protected up(): void {
    if (!this.start) return;
    const dragged = this.moved ? this.dragAt() : null;
    this.start = null;
    // the click that follows this pointer is this tap: it is done
    this.tapped = true;
    this.dragAt.set(null);
    this.checked.set(dragged === null ? !this.checked() : dragged >= 0.5);
    this.letGo();
  }

  protected cancel(): void {
    this.start = null;
    this.tapped = false;
    this.dragAt.set(null);
    this.letGo();
  }

  /** A tap on the words beside it. */
  protected tapText(): void {
    if (this.disabled()) return;
    this.hold();
    this.checked.set(!this.checked());
    this.letGo();
  }

  /**
   * A click: after a tap or a drag, already done; otherwise (Space or Enter on it, a screen reader, a click from code)
   * it switches it.
   */
  protected clicked(): void {
    if (this.tapped) {
      this.tapped = false;
      return;
    }
    if (this.disabled()) return;
    this.hold();
    this.checked.set(!this.checked());
    this.letGo();
  }

  private hold(): void {
    if (this.settle) clearTimeout(this.settle);
    this.active.set(true);
  }

  /** The thumb stays glass on its way, then is solid again. */
  private letGo(): void {
    if (this.settle) clearTimeout(this.settle);
    this.settle = setTimeout(() => this.active.set(false), SETTLE);
  }

  /** How far the thumb travels, px. */
  private travel(): number {
    const track = this.track().nativeElement;
    const height = track.clientHeight;
    return track.clientWidth - height * (THUMB_WIDTH * REST + 2 * INSET);
  }
}

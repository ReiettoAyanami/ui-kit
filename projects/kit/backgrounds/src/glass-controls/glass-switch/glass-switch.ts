import { Component, ElementRef, booleanAttribute, input, model, signal, viewChild } from '@angular/core';

import { glassLens } from '../lens';

/** How long the thumb stays glass after it is let go, ms: the time of its way to the other side. */
const SETTLE = 320;

/**
 * An on/off switch the way Apple's is (lenzi, 2026-11-25: "implementa gli slider/toggle/searchbar nel kit come quelli di
 * apple"): a capsule track, the accent when on; a solid capsule thumb that becomes Liquid Glass while it is held, larger,
 * bending the track under it (kube.io's switch, a lip bezel), slides with the pointer, and settles solid on its side.
 * A tap switches it; a drag puts it where it is let go; Space and Enter switch it too.
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
  private readonly lens = viewChild.required<ElementRef<HTMLElement>>('lens');
  private start: { x: number; at: number } | null = null;
  private moved = false;
  private settle: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    glassLens(() => this.lens().nativeElement);
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
    if (this.moved) this.dragAt.set(Math.min(1, Math.max(0, this.start.at + dx / Math.max(1, travel))));
  }

  protected up(): void {
    if (!this.start) return;
    const dragged = this.moved ? this.dragAt() : null;
    this.start = null;
    this.dragAt.set(null);
    this.checked.set(dragged === null ? !this.checked() : dragged >= 0.5);
    this.letGo();
  }

  protected cancel(): void {
    this.start = null;
    this.dragAt.set(null);
    this.letGo();
  }

  protected key(event: KeyboardEvent): void {
    if (this.disabled() || (event.key !== ' ' && event.key !== 'Enter')) return;
    event.preventDefault();
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
    return track.clientWidth - track.clientHeight * 1.4;
  }
}

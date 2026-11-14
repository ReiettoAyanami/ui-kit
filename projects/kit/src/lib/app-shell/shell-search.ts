import { DOCUMENT, DestroyRef, Directive, ElementRef, afterNextRender, effect, inject, signal, untracked } from '@angular/core';

import { LenziAppShell } from './app-shell';

/**
 * How long it follows the bar after the bar starts opening or closing, ms: at least as long as the bar's own
 * motion (its curve starts slowly: the first frames barely move), at most a little over a second.
 */
const FOLLOW_AT_LEAST = 450;
const FOLLOW_AT_MOST = 1500;

/**
 * A page's search bar that goes into the shell's top bar (lenzi, 2026-11-14: "if there's a search bar make it
 * slide there ... and incorporate it into the top bar", then "wait for the top bar to catch to the right of the
 * search bar, then incorporate it, keep it slide until it gets all the way to the right of the icon covering the
 * text"). Scrolled past the bar, the bar closes from the right; the search bar, sticking at the top, waits where
 * the page put it until the bar's edge reaches its right end, then rides on the edge (inside the bar's glass,
 * over the title) until it is just after the menu button. Opening, it rides back out on the edge and stays
 * where the page put it. Put it on the page's `LenziSearchBar`, a child of the page's own column (it sticks
 * inside its parent).
 *
 * It measures where the page lays it out (told to the shell: the closed bar ends where it does), and while the
 * bar opens or closes it reads the bar's edge every frame and moves along with it.
 */
@Directive({
  selector: '[lenziShellSearch]',
  host: {
    class: 'lenzi-shell-search',
    '[class.lenzi-shell-search-in-bar]': 'inBar()',
  },
})
export class LenziShellSearch {
  /** Riding on the bar's edge, or in the closed bar: drawn over the bar. */
  protected readonly inBar = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly shell = inject(LenziAppShell, { optional: true });
  /** Where the page lays it out, px (without the move). */
  private laidOut = { left: 0, right: 0 };
  /** How far it is moved now, px (0 or less: to the left). */
  private moved = 0;

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    afterNextRender(() => this.measure());
    const destroyed = inject(DestroyRef);
    destroyed.onDestroy(() => this.shell?.searchAt(null));
    if (!view) return;

    // While the bar opens or closes: its edge every frame, until it stops.
    let frame = 0;
    const follow = (startedAt: number) => {
      let still = 0;
      let last = Number.NaN;
      const step = (now: number) => {
        const edge = this.place();
        still = edge === last ? still + 1 : 0;
        last = edge;
        const going = now - startedAt < FOLLOW_AT_LEAST || still < 3;
        frame = going && now - startedAt < FOLLOW_AT_MOST ? view.requestAnimationFrame(step) : 0;
      };
      if (frame) view.cancelAnimationFrame(frame);
      frame = view.requestAnimationFrame(step);
    };
    effect(() => {
      this.shell?.compact();
      untracked(() => follow(view.performance.now()));
    });
    const onResize = () => {
      this.measure();
      this.place();
    };
    view.addEventListener('resize', onResize, { passive: true });
    destroyed.onDestroy(() => {
      view.removeEventListener('resize', onResize);
      if (frame) view.cancelAnimationFrame(frame);
    });
  }

  /** Where the page lays it out: its box without the move (its own padding does not move its box). */
  private measure(): void {
    const box = this.host.getBoundingClientRect();
    this.laidOut = { left: Math.round(box.left - this.moved), right: Math.round(box.right - this.moved) };
    this.shell?.searchAt(this.laidOut);
  }

  /**
   * Puts it on the bar's edge now: where the page put it while the edge is still to its right, on the edge
   * once the edge has reached it (the same gap as above and under it), never further left than just after the
   * button. Gives the edge back, to know when the bar has stopped.
   */
  private place(): number {
    const bar = this.shell?.barBox();
    if (!bar) return Number.NaN;
    const gap = (bar.height - this.host.offsetHeight) / 2;
    // just after the button: the closed bar is as wide as it is high
    const furthest = Math.min(0, bar.left + bar.height - this.laidOut.left);
    const moved = Math.round(Math.max(furthest, Math.min(0, bar.right - gap - this.laidOut.right)));
    if (moved !== this.moved) {
      this.moved = moved;
      this.host.style.translate = moved ? `${moved}px 0` : '';
    }
    this.inBar.set(moved < 0 || this.shell?.compact() === true);
    return Math.round(bar.right);
  }
}

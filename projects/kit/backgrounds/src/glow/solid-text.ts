import { DOCUMENT, DestroyRef, Directive, ElementRef, afterNextRender, inject, input, numberAttribute } from '@angular/core';

import { LenziSights } from '../sights/sights';

/**
 * How long the shadow is at most (times the font size of the words it falls from), in how many steps its hard shape is
 * drawn (each the letters again, a little farther along), and how far round the words a light counts (times their
 * box's larger side).
 */
const LENGTH = 0.14;
const STEPS = 8;
const AROUND = 1.2;

/**
 * Solid words lit from behind (lenzi, 2026-11-19: "lettere scure sul bagliore"; "deve proiettare ombra verso la
 * camera"; "dev'essere più definita e leggermente meno evidente, dev'essere simile a quella che usiamo per gli elementi
 * lit solidi"): the letters are the page's surface (`.lenzi-solid-text`), dark shapes over a glow behind the page, and
 * each throws a hard, faint shadow away from the light, as a solid element does.
 *
 * The shadow is the block of words itself, copied whole (its classes, its width: the same lines, the same letters) just
 * before it, so under it: each of its parts moved away from the light (the middle of the boids round the words,
 * `LenziSights.around`) by up to LENGTH of its own font size, the way back to the letters filled with the same letters
 * (a `text-shadow` of steps, opaque, so one hard shape), and all of it at one faintness. Straight behind the words the
 * light hides the shadow under them. On the bare page it is the page's colour (unseen); with no light round the words,
 * none.
 */
@Directive({
  selector: '[lenziSolidText]',
  host: { class: 'lenzi-solid-text' },
})
export class LenziSolidText {
  /** How much of the glow the shadow takes away, 0 to 1 (a solid element's takes `--lenzi-shadow`, 60%). */
  readonly shadowStrength = input(0.45, { transform: numberAttribute });

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly sights = inject(LenziSights);
  private readonly view = inject(DOCUMENT).defaultView;
  private shadow: HTMLElement | null = null;
  /** The font size of each of the words' own children, px: a heading's shadow as long as its letters are large. */
  private sizes: number[] = [];
  private frame: number | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.build();
      // the words changed: their shadow again (the shadow is outside them: building it changes nothing they watch)
      const watch = new MutationObserver(() => this.build());
      watch.observe(this.element, { childList: true, subtree: true, characterData: true });
      // where the words are and how wide, whenever that changes (the page's font arriving after the first layout: a
      // copy kept at the width before it broke its lines elsewhere, and read as the words twice)
      const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.fit()) : null;
      resize?.observe(this.element);
      void this.element.ownerDocument.fonts?.ready.then(() => this.build());
      const tick = () => {
        this.place();
        this.frame = this.view?.requestAnimationFrame(tick) ?? null;
      };
      tick();
      destroyRef.onDestroy(() => {
        watch.disconnect();
        resize?.disconnect();
        if (this.frame !== null) this.view?.cancelAnimationFrame(this.frame);
        this.shadow?.remove();
      });
    });
  }

  /** The shadow: the block of words copied whole, just before it (under it), hidden from screen readers. */
  private build(): void {
    this.shadow?.remove();
    const shadow = this.element.cloneNode(true) as HTMLElement;
    // a copy, not the words: no id, not the directive's mark
    shadow.removeAttribute('id');
    shadow.removeAttribute('lenzisolidtext');
    for (const element of Array.from(shadow.querySelectorAll('[id]'))) element.removeAttribute('id');
    shadow.classList.add('lenzi-solid-text-shadow');
    shadow.setAttribute('aria-hidden', 'true');
    shadow.setAttribute('inert', '');
    this.sizes = Array.from(this.element.children).map((child) => parseFloat(this.view?.getComputedStyle(child).fontSize ?? '') || 16);
    this.element.before(shadow);
    this.shadow = shadow;
    this.fit();
  }

  /**
   * The copy exactly where the words are, exactly as wide (to the fraction of a px: `offsetWidth` rounds, and a line
   * that just fitted in the words broke a word earlier in a copy a fifth of a px narrower), so the same lines.
   */
  private fit(): void {
    const shadow = this.shadow;
    if (!shadow) return;
    const box = this.element.getBoundingClientRect();
    const holder = (shadow.offsetParent as HTMLElement | null) ?? this.element.ownerDocument.documentElement;
    const room = holder.getBoundingClientRect();
    shadow.style.left = `${box.left - room.left - holder.clientLeft + holder.scrollLeft}px`;
    shadow.style.top = `${box.top - room.top - holder.clientTop + holder.scrollTop}px`;
    shadow.style.width = `${box.width}px`;
  }

  /** Over the words' place, each part moved away from the light now, as far as the light is from straight behind. */
  private place(): void {
    const shadow = this.shadow;
    if (!shadow) return;
    this.fit();
    const box = this.element.getBoundingClientRect();
    const shown = box.bottom > 0 && box.top < (this.view?.innerHeight ?? 0);
    const middle = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    const light = shown ? this.sights.around(middle, Math.max(box.width, box.height) * AROUND) : null;
    const strength = light ? Math.max(0, Math.min(1, this.shadowStrength())) * Math.min(1, light.count / 40) : 0;
    if (!light || strength === 0) {
      shadow.style.opacity = '0';
      return;
    }
    const dx = middle.x - light.x;
    const dy = middle.y - light.y;
    const away = Math.hypot(dx, dy);
    const off = Math.min(1, away / (Math.max(box.width, box.height) / 2));
    const ux = away > 1e-3 ? dx / away : 0;
    const uy = away > 1e-3 ? dy / away : 0;
    Array.from(shadow.children).forEach((child, c) => {
      const length = LENGTH * (this.sizes[c] ?? 16) * off;
      const part = child as HTMLElement;
      part.style.transform = `translate(${(ux * length).toFixed(2)}px, ${(uy * length).toFixed(2)}px)`;
      // the way back to the letters: the same letters, step by step, opaque (one hard shape)
      part.style.textShadow = Array.from({ length: STEPS - 1 }, (_, k) => {
        const back = (length * (k + 1)) / STEPS;
        return `${(-ux * back).toFixed(2)}px ${(-uy * back).toFixed(2)}px 0 currentColor`;
      }).join(', ');
    });
    shadow.style.opacity = strength.toFixed(3);
  }
}

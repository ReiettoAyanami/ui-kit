import { DOCUMENT, DestroyRef, Directive, ElementRef, afterNextRender, inject, input, numberAttribute } from '@angular/core';

import { LenziSights } from '../sights/sights';

/**
 * How many copies of the words make the shadow (one a step along it, so it is one hard shape), how long it is at most
 * (times the words' font size), and how far round the words a light counts (times their box's larger side).
 */
const STEPS = 8;
const LENGTH = 0.14;
const AROUND = 1.2;

/**
 * Solid words lit from behind (lenzi, 2026-11-19: "lettere scure sul bagliore"; "deve proiettare ombra verso la
 * camera"; "dev'essere più definita e leggermente meno evidente, dev'essere simile a quella che usiamo per gli elementi
 * lit solidi"): the letters are the page's surface (`.lenzi-solid-text`), dark shapes over a glow behind the page, and
 * each throws a hard, faint shadow away from the light, as a solid element does: the letters drawn again under
 * themselves, step by step along the way away from the light (the middle of the boids round the words,
 * `LenziSights.around`), as one shape at one faintness. The farther the light from straight behind the words, the
 * longer the shadow; straight behind them, it hides under them. On the bare page the shadow is the page's colour
 * (unseen); with no light round the words, none.
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
  private copies: HTMLElement[] = [];
  /** The font size of each of the words' own children, px: a heading's shadow is as long as its letters are large. */
  private sizes: number[] = [];
  private frame: number | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.build();
      const watch = new MutationObserver((changes) => {
        if (changes.some((change) => !this.shadow?.contains(change.target) && change.target !== this.shadow)) this.build();
      });
      watch.observe(this.element, { childList: true, subtree: true, characterData: true });
      const tick = () => {
        this.place();
        this.frame = this.view?.requestAnimationFrame(tick) ?? null;
      };
      tick();
      destroyRef.onDestroy(() => {
        watch.disconnect();
        if (this.frame !== null) this.view?.cancelAnimationFrame(this.frame);
        this.shadow?.remove();
      });
    });
  }

  /** The shadow: one layer under the words, holding the copies of them, laid out as they are. */
  private build(): void {
    this.shadow?.remove();
    const document = this.element.ownerDocument;
    const style = this.view?.getComputedStyle(this.element);
    const words = Array.from(this.element.childNodes);
    const own = parseFloat(style?.fontSize ?? '16') || 16;
    this.sizes = words.map((word) => (word instanceof Element ? parseFloat(this.view?.getComputedStyle(word).fontSize ?? '') || own : own));
    const shadow = document.createElement('div');
    shadow.className = 'lenzi-solid-text-shadow';
    shadow.setAttribute('aria-hidden', 'true');
    this.copies = Array.from({ length: STEPS }, () => {
      const copy = document.createElement('div');
      copy.className = 'lenzi-solid-text-copy';
      if (style) {
        for (const key of ['display', 'gap', 'justifyItems', 'alignItems', 'alignContent', 'textAlign', 'padding', 'gridTemplateColumns'] as const) {
          copy.style[key] = style[key];
        }
      }
      for (const word of words) copy.append(word.cloneNode(true));
      shadow.append(copy);
      return copy;
    });
    this.shadow = shadow;
    this.element.prepend(shadow);
  }

  /** The shadow away from where the light is now, as long as the light is far from straight behind; none without it. */
  private place(): void {
    const shadow = this.shadow;
    if (!shadow) return;
    const box = this.element.getBoundingClientRect();
    const shown = box.bottom > 0 && box.top < (this.view?.innerHeight ?? 0);
    const middle = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    const reach = Math.max(box.width, box.height) * AROUND;
    const light = shown ? this.sights.around(middle, reach) : null;
    const strength = light ? Math.max(0, Math.min(1, this.shadowStrength())) * Math.min(1, light.count / 40) : 0;
    if (!light || strength === 0) {
      shadow.style.opacity = '0';
      return;
    }
    const dx = middle.x - light.x;
    const dy = middle.y - light.y;
    const away = Math.hypot(dx, dy);
    // straight behind the words the shadow hides under them; the farther off, the longer, up to LENGTH of each one's font
    const off = Math.min(1, away / (Math.max(box.width, box.height) / 2));
    const ux = away > 1e-3 ? dx / away : 0;
    const uy = away > 1e-3 ? dy / away : 0;
    this.copies.forEach((copy, k) => {
      Array.from(copy.children).forEach((child, c) => {
        const step = (LENGTH * (this.sizes[c] ?? 16) * off * (k + 1)) / STEPS;
        (child as HTMLElement).style.transform = `translate(${(ux * step).toFixed(2)}px, ${(uy * step).toFixed(2)}px)`;
      });
    });
    shadow.style.opacity = strength.toFixed(3);
  }
}

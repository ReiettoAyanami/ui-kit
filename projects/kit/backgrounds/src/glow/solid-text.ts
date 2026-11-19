import { DOCUMENT, DestroyRef, Directive, ElementRef, afterNextRender, inject, input, numberAttribute } from '@angular/core';

import { LenziSights } from '../sights/sights';

/** How many copies make the shadow, how much larger the farthest is, and how far round the words a light counts. */
const LAYERS = 12;
const REACH = 0.12;
const AROUND = 1.2;

/**
 * Solid words lit from behind (lenzi, 2026-11-19: "lettere scure sul bagliore", "deve proiettare ombra verso la
 * camera"): the letters are the page's surface (`.lenzi-solid-text`), dark shapes over a glow behind the page, and the
 * light behind them throws their shadow towards whoever looks: copies of the letters, of the surface, under them and
 * over the background, each a little larger than the last from the point the light comes from (the middle of the
 * boids round the words, `LenziSights.around`), so the shadow grows out of each letter away from the light and moves
 * as the light does. On the bare page the copies are the page's colour (unseen); with no light round the words, none.
 */
@Directive({
  selector: '[lenziSolidText]',
  host: { class: 'lenzi-solid-text' },
})
export class LenziSolidText {
  /** How dark the shadow is where it is darkest, 0 to 1. */
  readonly shadowStrength = input(0.6, { transform: numberAttribute });

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly sights = inject(LenziSights);
  private readonly view = inject(DOCUMENT).defaultView;
  private layers: HTMLElement[] = [];
  private frame: number | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.build();
      const watch = new MutationObserver((changes) => {
        if (changes.some((change) => !this.layers.includes(change.target as HTMLElement) && !this.layers.some((layer) => layer.contains(change.target)))) this.build();
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
        for (const layer of this.layers) layer.remove();
      });
    });
  }

  /** The copies of the words, laid out as the words are, under them. */
  private build(): void {
    for (const layer of this.layers) layer.remove();
    const style = this.view?.getComputedStyle(this.element);
    const words = Array.from(this.element.childNodes);
    this.layers = Array.from({ length: LAYERS }, (_, k) => {
      const layer = this.element.ownerDocument.createElement('div');
      layer.className = 'lenzi-solid-text-shadow';
      layer.setAttribute('aria-hidden', 'true');
      if (style) {
        for (const key of ['display', 'gap', 'justifyItems', 'alignItems', 'alignContent', 'textAlign', 'padding', 'gridTemplateColumns'] as const) {
          layer.style[key] = style[key];
        }
      }
      for (const word of words) layer.append(word.cloneNode(true));
      layer.style.filter = `blur(${(0.5 + k * 0.45).toFixed(2)}px)`;
      this.element.prepend(layer);
      return layer;
    });
  }

  /** Each copy larger from where the light is now, as dark as the light is strong; none without light. */
  private place(): void {
    const box = this.element.getBoundingClientRect();
    const height = this.view?.innerHeight ?? 0;
    const shown = box.bottom > 0 && box.top < height;
    const light = shown ? this.sights.around({ x: box.left + box.width / 2, y: box.top + box.height / 2 }, Math.max(box.width, box.height) * AROUND) : null;
    const strength = light ? Math.max(0, Math.min(1, this.shadowStrength())) * Math.min(1, light.count / 40) : 0;
    this.layers.forEach((layer, k) => {
      if (!light || strength === 0) {
        layer.style.opacity = '0';
        return;
      }
      const scale = 1 + (REACH * (k + 1)) / LAYERS;
      layer.style.transformOrigin = `${light.x - box.left}px ${light.y - box.top}px`;
      layer.style.transform = `scale(${scale.toFixed(4)})`;
      // the copies near the letters darkest, the far ones faint: a shadow that fades as it grows
      layer.style.opacity = (strength * (1 - k / LAYERS) * 0.3).toFixed(3);
    });
  }
}

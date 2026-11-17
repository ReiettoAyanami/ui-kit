import { DestroyRef, Directive, ElementRef, afterNextRender, booleanAttribute, effect, inject, input, signal, untracked } from '@angular/core';

import { LenziLightField, fitLight } from '../glow/light-field';
import { LenziAmbientLight } from './ambient-light';

/**
 * A surface over a background, lit by it (lenzi, 2026-11-13: YouTube's buttons "like they're glass ...
 * responsive to flock / blob position and color"): it turns into glass (the background shows through
 * it, blurred, so it follows where the light is and what colour it has) and takes the background's
 * light as a veil over its colour and along its border. Only where the app asks: cards and panels
 * stay solid without it. Its colour is `--lenzi-lit-surface` (the page's surface unless set). The
 * styles are the kit's global ones (`.lenzi-lit`); Reduce transparency makes it solid and unlit.
 *
 * `[lenziLit]="overBackground"` lights it only while the app says so (lenzi, 2026-11-17: "wherever page we have a
 * background cards or any elements over the background should turn into lit elements"): off, it is the solid
 * surface it was, and takes no light. `lenziLit` alone is always on.
 */
@Directive({
  selector: '[lenziLit]',
  host: { '[class.lenzi-lit]': 'lenziLit()' },
})
export class LenziLit {
  /** Lit (the attribute alone: yes); off, the surface is what it is without it. */
  readonly lenziLit = input(true, { transform: booleanAttribute });

  constructor() {
    const surface = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const light = inject(LenziAmbientLight);
    const field = inject(LenziLightField);
    const rendered = signal(false);
    /** Lets go of the light; null while it takes none. */
    let release: (() => void) | null = null;

    const takeLight = () => {
      if (release) return;
      const unfit = fitLight(surface);
      // the background's light, and the light of the glowing elements around it (lenziGlow)
      const detach = light.attach(surface);
      const leave = field.addSurface(surface);
      release = () => {
        unfit();
        detach();
        leave();
        release = null;
      };
    };

    afterNextRender(() => rendered.set(true));
    effect(() => {
      if (!rendered()) return;
      const on = this.lenziLit();
      untracked(() => (on ? takeLight() : release?.()));
    });
    inject(DestroyRef).onDestroy(() => release?.());
  }
}

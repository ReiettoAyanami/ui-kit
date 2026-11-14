import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

import { LenziLightField, fitLight } from '../glow/light-field';
import { LenziAmbientLight } from './ambient-light';

/**
 * A surface over a background, lit by it (lenzi, 2026-11-13: YouTube's buttons "like they're glass ...
 * responsive to flock / blob position and color"): it turns into glass (the background shows through
 * it, blurred, so it follows where the light is and what colour it has) and takes the background's
 * light as a veil over its colour and along its border. Only where the app asks: cards and panels
 * stay solid without it. Its colour is `--lenzi-lit-surface` (the page's surface unless set). The
 * styles are the kit's global ones (`.lenzi-lit`); Reduce transparency makes it solid and unlit.
 */
@Directive({
  selector: '[lenziLit]',
  host: { class: 'lenzi-lit' },
})
export class LenziLit {
  constructor() {
    const surface = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const light = inject(LenziAmbientLight);
    const field = inject(LenziLightField);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      fitLight(surface);
      // the background's light, and the light of the glowing elements around it (lenziGlow)
      const detach = light.attach(surface);
      const leave = field.addSurface(surface);
      destroyRef.onDestroy(() => {
        detach();
        leave();
      });
    });
  }
}

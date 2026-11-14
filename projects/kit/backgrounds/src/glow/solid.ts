import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

import { LenziLightField } from './light-field';

/**
 * A solid element in the light (lenzi, 2026-11-14: "it could be cool to introduce a faint hard shadow ...
 * for if a solid component is interacting with light"): it keeps its own look (it is not glass), takes
 * the light of the lamps near it on the side that faces them, and stops it: behind it, away from each
 * lamp, a faint shadow with hard edges falls on the lit surfaces (`lenziLit`, a floor). The shadows are
 * drawn where the browser has paint worklets (Chromium); elsewhere it is only lit.
 */
@Directive({
  selector: '[lenziSolid]',
  host: { class: 'lenzi-solid' },
})
export class LenziSolid {
  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const field = inject(LenziLightField);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const style = getComputedStyle(element);
      element.classList.toggle('lenzi-lit-clipped', style.overflowX !== 'visible' || style.overflowY !== 'visible');
      const leave = field.addSurface(element);
      const stop = field.addCaster(element);
      destroyRef.onDestroy(() => {
        leave();
        stop();
      });
    });
  }
}

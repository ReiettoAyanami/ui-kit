import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

import { LenziLightField, LenziOutline, fitLight } from './light-field';

/**
 * A solid element in the light (lenzi, 2026-11-14: "it could be cool to introduce a faint hard shadow ...
 * for if a solid component is interacting with light"): it keeps its own look (it is not glass), takes
 * the light of the lamps near it on the side that faces them, and stops it: behind it, away from each
 * lamp, a faint shadow with hard edges falls on the lit surfaces (`lenziLit`, a floor). The shadows are
 * drawn where the browser has paint worklets (Chromium); elsewhere it is only lit.
 */
/** Whether a computed colour hides what is under it. */
function opaque(color: string): boolean {
  const alpha = /rgba?\([^)]*[,/]\s*([\d.]+%?)\s*\)/.exec(color)?.[1];
  if (color === 'transparent' || color === '') return false;
  if (alpha === undefined) return true;
  return (alpha.endsWith('%') ? parseFloat(alpha) / 100 : parseFloat(alpha)) >= 0.99;
}

@Directive({
  selector: '[lenziSolid]',
  host: { class: 'lenzi-solid' },
})
export class LenziSolid {
  /**
   * The outline of what it shows, when that is not its box (a drawing: `<lenzi-cat>`): points as fractions
   * of its box. Its shadow is cast from it. Nothing: its box, with its rounded corners.
   */
  readonly solidOutline = input<LenziOutline | null>(null);

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const field = inject(LenziLightField);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const style = getComputedStyle(element);
      const unfit = fitLight(element);
      // solid is opaque (2026-11-14: a "solid" toggle group showed the list under it): an element that is
      // see-through by itself (a toggle group, a list, an outlined button) takes the page's surface
      element.classList.toggle('lenzi-solid-fill', !opaque(style.backgroundColor));
      const leave = field.addSurface(element);
      const stop = field.addCaster(element, () => this.solidOutline());
      destroyRef.onDestroy(() => {
        unfit();
        leave();
        stop();
      });
    });
  }
}

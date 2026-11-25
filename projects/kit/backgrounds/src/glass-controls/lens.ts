// The glass a control's thumb becomes while it is held (lenzi, 2026-11-25: Apple's switch, "quando clicchi va alla
// prossima opzione diventando vetro"; kube.io's switch: "a lip bezel, which makes the surface convex on the outside and
// concave in the middle. This makes the center slider zoomed out, while the edges refract the inside"). One Liquid Glass
// for the lens element, drawn once for its size. A plain module (no schematic makes one).
import { DOCUMENT, DestroyRef, afterNextRender, inject } from '@angular/core';

import { LenziSights } from '../sights/sights';
import { LIQUID_GLASS_SETTINGS, LenziLiquidGlassSettings, LenziLiquidSurface, refracts } from '../liquid-glass/liquid-surface';

/** The lens's optics: the lip bezel, kube.io's defaults (refraction 1, blur 0.2, specular 0.5 and 6), no moving rim. */
export const LENS_SETTINGS: LenziLiquidGlassSettings = {
  ...LIQUID_GLASS_SETTINGS,
  surface: 'lip',
  bezel: 12,
  thickness: 22,
  rim: 0,
  pointerReach: 0,
};

/**
 * Makes `element()` a Liquid Glass lens once it is in the page (Chromium bends; elsewhere the kit's `.lenzi-liquid-glass`
 * blur). Call it where `inject()` works (a field, a constructor). Redraws when its size changes.
 */
export function glassLens(element: () => HTMLElement | undefined, settings: LenziLiquidGlassSettings = LENS_SETTINGS): void {
  const document = inject(DOCUMENT);
  const sights = inject(LenziSights);
  const destroyRef = inject(DestroyRef);
  let surface: LenziLiquidSurface | null = null;
  let resize: ResizeObserver | null = null;
  afterNextRender(() => {
    const target = element();
    if (!target || !refracts(document.defaultView)) return;
    surface = new LenziLiquidSurface(target, document, sights, () => settings);
    surface.build();
    if (typeof ResizeObserver === 'function') {
      resize = new ResizeObserver(() => surface?.build());
      resize.observe(target);
    }
  });
  destroyRef.onDestroy(() => {
    resize?.disconnect();
    surface?.destroy();
  });
}

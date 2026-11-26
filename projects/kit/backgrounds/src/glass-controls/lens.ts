// The glass a control's thumb is (lenzi, 2026-11-25: Apple's switch, "quando clicchi va alla prossima opzione diventando
// vetro"; kube.io's switch, read from its code: one thumb, always glass under a white fill; held, the fill goes to 10%,
// the thumb grows and bends more, 0.4 to 0.9 of its bending). One Liquid Glass for the thumb, drawn for its own size
// (a scale animation keeps it). A plain module (no schematic makes one).
import { DOCUMENT, DestroyRef, afterNextRender, inject } from '@angular/core';

import { LIQUID_GLASS_SETTINGS, LenziLiquidGlassSettings, LenziLiquidSurface, refracts } from '../liquid-glass/liquid-surface';

/**
 * The thumb's optics: kube.io's switch (a lip bezel, blur 0.2, specular 0.5 and 6), thicker and bending more, so the
 * glass shows on something as small as a thumb (lenzi, 2026-11-26: "configura gli elementi più piccoli per fare in modo che l'effetto liquidglass si veda meglio, come lo slider, toggle ecc."): thickness 36 (kube.io's 22), refraction 1.5.
 */
export const LENS_SETTINGS: LenziLiquidGlassSettings = {
  ...LIQUID_GLASS_SETTINGS,
  surface: 'lip',
  bezel: 12,
  thickness: 36,
  refraction: 1.5,
  blur: 0.2,
  specularOpacity: 0.5,
  specularSaturation: 6,
};

/**
 * How much of its bending a thumb shows at rest and while held (kube.io's: 0.4 and 0.9; 2026-11-26: 0.8 and 1.2, the
 * glass seen at rest too, a thumb's fill there only milky: `--lenzi-glass-rest`).
 */
export const LENS_BENDING = { rest: 0.8, held: 1.2 } as const;

/** A thumb's glass, once it is in the page. */
export interface LenziGlassLens {
  /** How much of its bending it shows, 0 to 1. */
  bending(share: number): void;
}

/**
 * Makes `element()` a Liquid Glass thumb once it is in the page (Chromium bends; elsewhere the control's CSS blurs).
 * Call it where `inject()` works (a field, a constructor). Redraws when its own size changes.
 */
export function glassLens(element: () => HTMLElement | undefined, settings: LenziLiquidGlassSettings = LENS_SETTINGS, rest: number = LENS_BENDING.rest): LenziGlassLens {
  const document = inject(DOCUMENT);
  const destroyRef = inject(DestroyRef);
  let surface: LenziLiquidSurface | null = null;
  let resize: ResizeObserver | null = null;
  let share = rest;
  afterNextRender(() => {
    const target = element();
    if (!target || !refracts(document.defaultView)) return;
    surface = new LenziLiquidSurface(target, document, () => settings);
    surface.bending(share);
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
  return {
    bending(value: number): void {
      share = value;
      surface?.bending(value);
    },
  };
}

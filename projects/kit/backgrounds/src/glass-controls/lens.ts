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
  // convex, not kube.io's lip: bending this much, a lip's concave middle took pixels from past the thumb's edge, where
  // nothing is, and drew a box inside it (lenzi, 2026-11-26: "ci sono dei problemi con questi selettori ... hanno un
  // quadratino sopra"); a convex bezel takes from inside
  surface: 'squircle',
  bezel: 12,
  thickness: 36,
  refraction: 1.5,
  blur: 0.2,
  specularOpacity: 0.5,
  specularSaturation: 6,
  // its edge's line shows all round over a dark panel too (lenzi, 2026-11-26: "la barra di ricerca nella overview non é glass e non il pomello del toggle ancora non lo é, o comunque si vede poco")
  lightBase: 0.45,
  // the light gathered close round it, as before (2026-11-26: the panels' reach went to 24, for highlights that end soft)
  lightReach: 12,
  // a real pill: curved to its middle (lenzi, 2026-11-26: "più rotonde sopra come una pillola vera, senza che si tagli a
  // metà")
  dome: true,
};

/**
 * The glass of a capsule that slides over words (a segmented control's, the tab bar's): a flat middle, not a dome (lenzi,
 * 2026-11-26, a segmented control's capsule and a thumb over a label: "non so cosa succede con il testo": a dome
 * magnifies what is under all of it, and words under it came out large and doubled). Its middle shows the words as they
 * are, its bezel bends them at its edge.
 */
export const CAPSULE_SETTINGS: LenziLiquidGlassSettings = { ...LENS_SETTINGS, dome: false };

/**
 * How much of its bending a thumb shows at rest and while held (kube.io's: 0.4 and 0.9; 2026-11-26: 0.8 and 1.2, the
 * glass seen at rest too, a thumb's fill there only milky: `--lenzi-glass-rest`).
 */
export const LENS_BENDING = { rest: 0.8, held: 1.2 } as const;

/** A thumb's glass, once it is in the page. */
export interface LenziGlassLens {
  /** How much of its bending it shows, 0 to 1. */
  bending(share: number): void;
  /** Its filter again, for settings that changed (a knob's shape, frozen when it is held). */
  refresh(): void;
}

/**
 * Makes `element()` a Liquid Glass thumb once it is in the page (Chromium bends; elsewhere the control's CSS blurs).
 * Call it where `inject()` works (a field, a constructor). Redraws when its own size changes.
 */
export function glassLens(
  element: () => HTMLElement | undefined,
  settings: LenziLiquidGlassSettings | (() => LenziLiquidGlassSettings) = LENS_SETTINGS,
  rest: number = LENS_BENDING.rest,
): LenziGlassLens {
  const read = typeof settings === 'function' ? settings : () => settings;
  const document = inject(DOCUMENT);
  const destroyRef = inject(DestroyRef);
  let surface: LenziLiquidSurface | null = null;
  let resize: ResizeObserver | null = null;
  let share = rest;
  afterNextRender(() => {
    const target = element();
    if (!target || !refracts(document.defaultView)) return;
    // on itself, not on a layer: a thumb holds no glass, and its fill lies over its glass (glassPlace)
    surface = new LenziLiquidSurface(target, document, read, false);
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
    refresh(): void {
      surface?.build();
    },
  };
}

// What a moving lens becomes where it lands (lenzi, 2026-11-27: "questi pomelli-lente che hanno l'animazione di
// transizione vorrei che avessero una proprietà upon_landing: <material>, che determina se il pomello deve diventare
// lente o diventare solido/vetro solido ... così da determinare se la lente deve rimanere lente o no"): the segmented
// control's capsule, the tab bar's, the glass list's lens. On its way it is always clear glass. A plain module (no
// schematic makes one).
import { EnvironmentProviders, InjectionToken, computed, inject, makeEnvironmentProviders, Signal } from '@angular/core';

/**
 * Its material once it lands: `liquid` it stays a lens of clear glass; `milky` glass under a milky fill (the kit's until
 * 2026-11-27); `solid` a solid capsule, as a slider's knob at rest.
 */
export type LenziLandingMaterial = 'liquid' | 'milky' | 'solid';

/** A solid landing's colour: light (white, as Apple's knobs) or dark (the page's highest surface). */
export type LenziLandingTone = 'light' | 'dark';

export interface LenziGlassLanding {
  material: LenziLandingMaterial;
  tone: LenziLandingTone;
}

/**
 * The app's landing, unless a control says its own: solid, dark (one option a branch: lenzi, 2026-11-27, "le tre
 * opzioni su 3 branch diversi").
 */
export const LENZI_GLASS_LANDING = new InjectionToken<LenziGlassLanding>('LENZI_GLASS_LANDING', {
  factory: () => ({ material: 'solid', tone: 'dark' }),
});

/** Every moving lens of the app lands so (each control may still say its own: `landing`, `landingTone`). */
export function provideLenziGlassLanding(landing: Partial<LenziGlassLanding>): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: LENZI_GLASS_LANDING, useValue: { material: 'solid', tone: 'dark', ...landing } }]);
}

/**
 * A control's landing: its own inputs over the app's. Its host says it as `data-landing` and `data-tone`, which its styles
 * read. Call it where `inject()` works.
 */
export function resolveLanding(material: Signal<LenziLandingMaterial | null>, tone: Signal<LenziLandingTone | null>): Signal<LenziGlassLanding> {
  const app = inject(LENZI_GLASS_LANDING);
  return computed(() => ({ material: material() ?? app.material, tone: tone() ?? app.tone }));
}

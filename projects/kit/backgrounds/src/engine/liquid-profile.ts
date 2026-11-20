// Liquid glass for the blobs (lenzi, 2026-11-19: "capire se questa tecnica per il rendering del vetro si può usare su
// forme che non sono regolari e stabili come le supershapes ... così possiamo mettere un'altra scelta nel kit"). The
// bending of `lenziLiquidGlass` (kube.io, "Liquid Glass in the Browser", Chris Feijoo): a curved bezel round the
// edge bends a ray from behind by Snell's law, and it moves sideways crossing the glass. The directive draws that
// shift into a picture for its one, still box; a blob changes shape at every frame, so here it is a profile of the
// shift over the bezel, read by the blobs' shader at the distance from the edge that their field gives at every
// place (the field's slope is the edge's normal). A plain module (no schematic makes one).

import { bezelShift } from '../liquid-glass/liquid-glass-maps';

/** Glass that bends what is behind it instead of frosting it. CSS px. */
export interface LenziLiquidBlobGlass {
  /** How wide the curved bezel round the edge is. */
  bezel: number;
  /** How thick the glass is: the thicker, the more it bends. */
  thickness: number;
  /** Its refractive index (air is 1). */
  ior: number;
  /** How much of the bending is shown, 0 to 1 and beyond. */
  refraction: number;
}

/**
 * How a background's glass blobs look (lenzi, 2026-11-19): `frosted`, the page's glass (`lenziLit`), or `liquid`,
 * clear glass that bends what is behind it near its edge, as `lenziLiquidGlass`.
 */
export type LenziGlassKind = 'frosted' | 'liquid';

/**
 * The liquid glass of the blobs, unless told otherwise. Was 22 and 48, a little narrower than the directive's (blobs are
 * small); then the same lens half as large again, its bezel and its thickness (lenzi, 2026-11-20: "una forma
 * leggermente più marcata in modo da mostrare leggermente di più l'effetto sui bordi ... un 1.5x"). A part thinner
 * than two bezels (a drop) takes it smaller, to its middle.
 */
export const LIQUID_GLASS: LenziLiquidBlobGlass = { bezel: 33, thickness: 72, ior: 1.5, refraction: 1 };

/** How many steps the profile has over the bezel (it has one more value: the edge and the bezel's inner end). */
export const LIQUID_STEPS = 32;

/** The shift over the bezel, from the edge in: each a share of the largest (convex: towards the inside), and the largest, px. */
export interface LiquidProfile {
  shifts: Float32Array;
  largest: number;
}

/** The profile of a liquid glass: the bezel's squircle (Apple's convex default), as the directive's. */
export function liquidProfile(look: LenziLiquidBlobGlass): LiquidProfile {
  const bezel = Math.max(1, look.bezel);
  const shape = { bezel, thickness: Math.max(0, look.thickness), ior: Math.max(1, look.ior), surface: 'squircle' as const };
  const raw = Array.from({ length: LIQUID_STEPS + 1 }, (_, i) => bezelShift(shape, (i / LIQUID_STEPS) * bezel));
  const largest = Math.max(0, ...raw.map(Math.abs));
  const shifts = new Float32Array(raw.map((shift) => (largest > 1e-6 ? shift / largest : 0)));
  return { shifts, largest: largest * Math.max(0, look.refraction) };
}

/** A background's glass as the blobs' look takes it: none when frosted; liquid, with what is not said from `LIQUID_GLASS`. */
export function liquidLookOf(kind: LenziGlassKind | null | undefined, settings?: Partial<LenziLiquidBlobGlass> | null): LenziLiquidBlobGlass | null {
  return kind === 'liquid' ? { ...LIQUID_GLASS, ...(settings ?? {}) } : null;
}

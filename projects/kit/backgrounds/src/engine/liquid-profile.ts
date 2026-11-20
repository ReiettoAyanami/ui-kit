// Liquid glass for the blobs (lenzi, 2026-11-19: "capire se questa tecnica per il rendering del vetro si può usare su
// forme che non sono regolari e stabili come le supershapes ... così possiamo mettere un'altra scelta nel kit"). The
// bending of `lenziLiquidGlass` (kube.io, "Liquid Glass in the Browser", Chris Feijoo): a curved bezel round the
// edge bends a ray from behind by Snell's law, and it moves sideways crossing the glass. The directive draws that
// shift into a picture for its one, still box; a blob changes shape at every frame, so here it is a profile of the
// shift over the bezel, read by the blobs' shader at the distance from the edge that their field gives at every
// place (the field's slope is the edge's normal). A plain module (no schematic makes one).

import { LenziGlassSurface, bezelShift } from '../liquid-glass/liquid-glass-maps';

/**
 * Glass that bends what is behind it instead of frosting it. CSS px. Its optics are the directive's (`lenziLiquidGlass`):
 * the bezel, its profile, the thickness, the refractive index, how much of the bending, the saturation and the blur of
 * what is seen through it (lenzi, 2026-11-20: "per regolare le varie proprietà dello stesso").
 */
export interface LenziLiquidBlobGlass {
  /** How wide the curved bezel round the edge is. */
  bezel: number;
  /** How thick the glass is: the thicker, the more it bends. */
  thickness: number;
  /** Its refractive index (air is 1). */
  ior: number;
  /** How much of the bending is shown, 0 to 1 and beyond. */
  refraction: number;
  /** The bezel's profile: `squircle` (Apple's convex default), `circle` (rounder, it bends more at once), `lip` (convex, then concave). */
  surface: LenziGlassSurface;
  /** How saturated what is seen through it is (1: as it is), at most: only as much as a colour takes. */
  saturation: number;
  /** How much what is seen through it is blurred, px (0: sharp). */
  blur: number;
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
 * than two bezels (a drop) takes it smaller, to its middle. Sharp, a little more saturated than the picture.
 */
export const LIQUID_GLASS: LenziLiquidBlobGlass = { bezel: 33, thickness: 72, ior: 1.5, refraction: 1, surface: 'squircle', saturation: 1.4, blur: 0 };

/** The bezel's profiles there are, in the order a choice shows them. */
export const LIQUID_GLASS_SURFACES: readonly LenziGlassSurface[] = ['squircle', 'circle', 'lip'];

/** How far each number of the blobs' liquid glass goes (a maker's sliders, a link read back), and a step for it. */
export const LIQUID_GLASS_LIMITS = {
  bezel: { min: 4, max: 90, step: 1 },
  thickness: { min: 0, max: 200, step: 1 },
  ior: { min: 1, max: 3, step: 0.05 },
  refraction: { min: 0, max: 3, step: 0.05 },
  saturation: { min: 0, max: 3, step: 0.05 },
  blur: { min: 0, max: 8, step: 0.25 },
} as const satisfies Record<Exclude<keyof LenziLiquidBlobGlass, 'surface'>, { min: number; max: number; step: number }>;

/** The numbers of the blobs' liquid glass, in the order a maker shows them. */
export type LenziLiquidGlassNumber = keyof typeof LIQUID_GLASS_LIMITS;

/**
 * The blobs' liquid glass from anything (a link, a saved scene): only what it says that is one of its settings, each
 * within its bounds; null when it says none of them.
 */
export function cleanLiquidGlass(raw: unknown): Partial<LenziLiquidBlobGlass> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const given = raw as Record<string, unknown>;
  const out: Partial<LenziLiquidBlobGlass> = {};
  for (const key of Object.keys(LIQUID_GLASS_LIMITS) as LenziLiquidGlassNumber[]) {
    const value = given[key];
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = Math.min(LIQUID_GLASS_LIMITS[key].max, Math.max(LIQUID_GLASS_LIMITS[key].min, value));
  }
  if (LIQUID_GLASS_SURFACES.includes(given['surface'] as LenziGlassSurface)) out.surface = given['surface'] as LenziGlassSurface;
  return Object.keys(out).length ? out : null;
}

/** How many steps the profile has over the bezel (it has one more value: the edge and the bezel's inner end). */
export const LIQUID_STEPS = 32;

/** The shift over the bezel, from the edge in: each a share of the largest (convex: towards the inside), and the largest, px. */
export interface LiquidProfile {
  shifts: Float32Array;
  largest: number;
}

/** The profile of a liquid glass: its bezel's (the squircle, Apple's convex default, unless it says), as the directive's. */
export function liquidProfile(look: Pick<LenziLiquidBlobGlass, 'bezel' | 'thickness' | 'ior' | 'refraction'> & { surface?: LenziGlassSurface }): LiquidProfile {
  const bezel = Math.max(1, look.bezel);
  const shape = { bezel, thickness: Math.max(0, look.thickness), ior: Math.max(1, look.ior), surface: look.surface ?? 'squircle' };
  const raw = Array.from({ length: LIQUID_STEPS + 1 }, (_, i) => bezelShift(shape, (i / LIQUID_STEPS) * bezel));
  const largest = Math.max(0, ...raw.map(Math.abs));
  const shifts = new Float32Array(raw.map((shift) => (largest > 1e-6 ? shift / largest : 0)));
  return { shifts, largest: largest * Math.max(0, look.refraction) };
}

/** A background's glass as the blobs' look takes it: none when frosted; liquid, with what is not said from `LIQUID_GLASS`. */
export function liquidLookOf(kind: LenziGlassKind | null | undefined, settings?: Partial<LenziLiquidBlobGlass> | null): LenziLiquidBlobGlass | null {
  if (kind !== 'liquid') return null;
  // a setting said as undefined is not said
  const said = Object.fromEntries(Object.entries(settings ?? {}).filter(([, value]) => value !== undefined && value !== null));
  return { ...LIQUID_GLASS, ...said };
}

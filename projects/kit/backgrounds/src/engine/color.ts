// The colours of a glowing background: the accent, moved a little for every object so that repeated
// objects (blobs, boids) are not all the same (lenzi, 2026-11-13: "with some displacement variable to
// make it a little different ... the displacement shouldn't be too much by default"). The moving is
// done in OKLCH (hue, lightness and chroma as the eye sees them), and it is the same at every frame
// and every visit: it comes from the object's index and a seed, never from chance. Colours are linear
// RGB here (light adds up in linear), turned into the screen's sRGB at the end. A plain module (no
// schematic makes one).

/** Linear RGB, each 0..1 (more than 1 only as light being added up). */
export type LinearRgb = [number, number, number];

const toLinear = (channel: number) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
const toSrgb = (channel: number) => (channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** `#rrggbb` as linear RGB. Anything else is black. */
export function hexToLinear(hex: string): LinearRgb {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return [0, 0, 0];
  const number = parseInt(match[1]!, 16);
  return [toLinear(((number >> 16) & 255) / 255), toLinear(((number >> 8) & 255) / 255), toLinear((number & 255) / 255)];
}

/** Linear RGB as `#rrggbb` (out-of-range light is clipped). */
export function linearToHex([r, g, b]: LinearRgb): string {
  const byte = (channel: number) =>
    Math.round(clamp01(toSrgb(clamp01(channel))) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

/** How bright a colour is to the eye, 0..1 (the relative luminance). */
export function luminance([r, g, b]: LinearRgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Lightness 0..1, chroma (0 grey, about 0.37 at most), hue in degrees. */
export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export function linearToOklch([r, g, b]: LinearRgb): Oklch {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: lightness, c: Math.hypot(a, bb), h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 };
}

/** Back to linear RGB; a colour the screen cannot show is clipped. */
export function oklchToLinear({ l, c, h }: Oklch): LinearRgb {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const ll = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const ss = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    clamp01(4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss),
    clamp01(-1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss),
    clamp01(-0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss),
  ];
}

/** A stream of numbers in 0..1 that is always the same for the same seed (mulberry32). */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How far `spread` 1 moves a colour: the hue by ±60°, the lightness by ±0.18, the chroma by ±40%. */
export const SPREAD_HUE = 60;
export const SPREAD_LIGHTNESS = 0.18;
export const SPREAD_CHROMA = 0.4;
/** A little by default: the hue by ±12°. */
export const DEFAULT_SPREAD = 0.2;

/**
 * The accent for the object number `index`: the same colour, moved by `spread` (0: all the same; 1:
 * a lot) in a direction of its own. The same index, spread and seed always give the same colour.
 */
export function displacedColor(accent: LinearRgb, index: number, spread = DEFAULT_SPREAD, seed = 1): LinearRgb {
  if (spread <= 0) return accent;
  const random = seeded(Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(seed, 0x85ebca6b));
  const base = linearToOklch(accent);
  const hue = (random() * 2 - 1) * SPREAD_HUE * spread;
  const lightness = (random() * 2 - 1) * SPREAD_LIGHTNESS * spread;
  const chroma = (random() * 2 - 1) * SPREAD_CHROMA * spread;
  return oklchToLinear({ l: Math.min(0.98, Math.max(0.05, base.l + lightness)), c: Math.max(0, base.c * (1 + chroma)), h: (base.h + hue + 360) % 360 });
}

/**
 * A colour that shifts among a few (lenzi, 2026-11-15: "opzione color: multi ... per decidere dei colori tra cui
 * shiftare come la home"): at `t` (0 to 1, round again) along the loop from the first to the last and back to the
 * first, each held a little and eased into the next.
 */
export function paletteAt(palette: readonly LinearRgb[], t: number): LinearRgb {
  if (palette.length === 0) return [1, 1, 1];
  if (palette.length === 1) return palette[0]!;
  const along = (((t % 1) + 1) % 1) * palette.length;
  const from = Math.floor(along);
  const a = palette[from % palette.length]!;
  const b = palette[(from + 1) % palette.length]!;
  // held for a third of its stretch, then eased into the next
  const k = Math.min(1, Math.max(0, (along - from - 0.33) / 0.67));
  const mix = k * k * (3 - 2 * k);
  return [a[0] + (b[0] - a[0]) * mix, a[1] + (b[1] - a[1]) * mix, a[2] + (b[2] - a[2]) * mix];
}

/** How long a shifting colour takes from one of its colours to the next, seconds. */
export const PALETTE_STEP = 6;

/** The colours of `count` objects, as one array (r, g, b, r, g, b, …) for the GPU. */
export function displacedColors(accent: LinearRgb, count: number, spread = DEFAULT_SPREAD, seed = 1): Float32Array {
  const colors = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) colors.set(displacedColor(accent, index, spread, seed), index * 3);
  return colors;
}

// The identity colour of an entity, computed from its id. A plain module (no schematic makes one).
// From substance-tracker `ui/identity-color-pipe.ts`: the same algorithm, the same colours.

/** Step between consecutive ids, as a fraction of the band: the golden ratio, so neighbouring ids land far apart. */
const GOLDEN_RATIO = 0.6180339887;

/** The band of hues (oklch degrees): blue-violet, violet, purple, magenta; the theme's own violet. */
export const IDENTITY_HUE_FROM = 260;
export const IDENTITY_HUE_SPAN = 80;

/** Three lightnesses, by `id % 3`: two neighbouring hues still differ in lightness. */
export const IDENTITY_LIGHTNESS = [0.88, 0.74, 0.6] as const;

/** The most chroma a colour takes; less where sRGB cannot show it (the light violets). */
export const IDENTITY_MAX_CHROMA = 0.22;

/**
 * Where a kind of entity starts in the band. Two kinds with separate id sequences (substances and
 * batches) must not share a colour for the same id: the second starts half the band away (0.5).
 */
export type IdentityOffset = number;

/**
 * The identity colour of an entity (RULES.md, "Identity colours"): computed from its id, never
 * stored, never a status colour. All violet (lenzi, 2026-10-02: "terrei tutto viola anche per le
 * sostanze e i batch"): the hue walks the band by the golden ratio, the lightness is one of three by
 * `id % 3`, the chroma the most the screen can show up to 0.22, so no colour is clipped into another.
 * A plain `oklch()` string, as the browser writes it back.
 * FROZEN: changing the algorithm repaints every entity of every app.
 */
export function identityColor(id: number, offset: IdentityOffset = 0): string {
  // The same arithmetic as substance-tracker for every id it ever had (0 and up); a negative id is
  // folded back into the band.
  let position = (id * GOLDEN_RATIO + offset) % 1;
  if (position < 0) position += 1;
  const hue = IDENTITY_HUE_FROM + position * IDENTITY_HUE_SPAN;
  const lightness = IDENTITY_LIGHTNESS[id % 3 < 0 ? (id % 3) + 3 : id % 3]!;
  const chroma = maxChroma(lightness, hue);
  // As the browser writes it back (no trailing zeros), so a style reads the same string.
  return `oklch(${lightness} ${chroma} ${Number(hue.toFixed(1))})`;
}

/** The most chroma, up to IDENTITY_MAX_CHROMA, that keeps the colour inside sRGB (bisection, to a thousandth). */
function maxChroma(lightness: number, hue: number): number {
  if (inSrgb(lightness, IDENTITY_MAX_CHROMA, hue)) return IDENTITY_MAX_CHROMA;
  let low = 0;
  let high = IDENTITY_MAX_CHROMA;
  while (high - low > 0.0005) {
    const middle = (low + high) / 2;
    if (inSrgb(lightness, middle, hue)) low = middle;
    else high = middle;
  }
  return Math.floor(low * 1000) / 1000;
}

/** Whether an oklch colour is one sRGB can show (OKLab to linear sRGB, Björn Ottosson's matrices). */
function inSrgb(lightness: number, chroma: number, hue: number): boolean {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return rgb.every((channel) => channel >= -1e-6 && channel <= 1 + 1e-6);
}

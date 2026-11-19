/**
 * The maps of Liquid Glass (lenzi, 2026-11-19: "deve essere quasi come il liquid glass di IOS ... un materiale che si
 * chiama appunto LenziLiquidGlass"; the way: kube.io, "Liquid Glass in the Browser: Refraction with CSS and SVG",
 * Chris Feijoo). Plain numbers, no DOM: what the directive turns into the SVG filter's images.
 *
 * The glass is a slab with a curved bezel round its edge (its height a function of the distance from the edge). A ray
 * from the page behind, coming straight at the viewer, meets the bezel's slope and bends (Snell: n₁ sin θ₁ = n₂ sin θ₂,
 * air 1, glass `ior`); after crossing the glass's height it has moved sideways: that is where the pixel seen at a place
 * comes from. Inside the bezel the glass is flat: nothing moves.
 */

/** The bezel's profile: its height (0 to 1) at a distance from the outer edge (0 to 1 of the bezel). */
export type LenziGlassSurface = 'squircle' | 'circle' | 'lip';

export interface LenziLiquidGlassShape {
  /** Size of the glass, px. */
  width: number;
  height: number;
  /** Its corners' radius, px. */
  radius: number;
  /** How wide the curved bezel is, px. */
  bezel: number;
  /** How thick the glass is at its flat middle, px. */
  thickness: number;
  /** The glass's refractive index (air is 1). */
  ior: number;
  surface: LenziGlassSurface;
  /** Where the light of the rim comes from, degrees (0: from the right, -90: from the top). */
  lightAngle: number;
}

export interface LenziLiquidGlassMaps {
  width: number;
  height: number;
  /** RGBA: red and green the displacement (128 none, 128 ± 127 the largest), blue 128, alpha 255. */
  displacement: Uint8ClampedArray;
  /** The largest displacement, px: feDisplacementMap's scale. */
  scale: number;
  /** RGBA: white, its alpha the rim's light from `lightAngle`. */
  specular: Uint8ClampedArray;
  /**
   * The rim's light from each of RIM_ANGLES (degrees) and, last, from all round (`angle` null): what the glass shows
   * as the boids come from one side or settle under it.
   */
  rims: { angle: number | null; data: Uint8ClampedArray }[];
}

/** The sides a rim can be lit from, degrees (0: from the right, 90: from below). */
export const RIM_ANGLES = [0, 45, 90, 135, 180, -135, -90, -45] as const;

const convexSquircle = (x: number) => Math.pow(1 - Math.pow(1 - x, 4), 1 / 4);
const convexCircle = (x: number) => Math.sqrt(1 - (1 - x) ** 2);
const smootherstep = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

/** The bezel's height (0 to 1) at a distance `x` (0 to 1) from the outer edge. */
export function glassHeight(surface: LenziGlassSurface, x: number): number {
  const t = Math.min(1, Math.max(0, x));
  if (surface === 'circle') return convexCircle(t);
  if (surface === 'lip') {
    const convex = convexSquircle(t);
    return convex + (1 - convex - convex) * smootherstep(t);
  }
  return convexSquircle(t);
}

/**
 * How far sideways a ray moves at a distance `d` px from the outer edge (inside the bezel), px: the slope there bends
 * it by θ₁ − θ₂, and it crosses the glass's height there.
 */
export function bezelShift(shape: Pick<LenziLiquidGlassShape, 'bezel' | 'thickness' | 'ior' | 'surface'>, d: number): number {
  const bezel = Math.max(1, shape.bezel);
  if (d <= 0 || d >= bezel) return 0;
  const x = d / bezel;
  const delta = 0.001;
  const slope = ((glassHeight(shape.surface, x + delta) - glassHeight(shape.surface, x - delta)) / (2 * delta)) * (shape.thickness / bezel);
  const incidence = Math.atan(Math.abs(slope));
  const refracted = Math.asin(Math.sin(incidence) / Math.max(1, shape.ior));
  return Math.sign(slope) * glassHeight(shape.surface, x) * shape.thickness * Math.tan(incidence - refracted);
}

/** Signed distance from a rounded rectangle's edge (negative inside), centred on 0, half sizes hw, hh. */
function roundedBox(px: number, py: number, hw: number, hh: number, r: number): number {
  const qx = Math.abs(px) - (hw - r);
  const qy = Math.abs(py) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/** The maps for a glass of this shape: where each pixel is seen from, and the rim's light. */
export function liquidGlassMaps(shape: LenziLiquidGlassShape): LenziLiquidGlassMaps {
  const width = Math.max(1, Math.round(shape.width));
  const height = Math.max(1, Math.round(shape.height));
  const hw = width / 2;
  const hh = height / 2;
  const radius = Math.min(Math.max(0, shape.radius), hw, hh);
  const bezel = Math.max(1, Math.min(shape.bezel, hw, hh));
  // the shift at each distance from the edge, once (it depends on nothing else), and the largest
  const steps = Math.ceil(bezel * 2);
  const shifts = Array.from({ length: steps + 1 }, (_, i) => bezelShift({ ...shape, bezel }, (i / steps) * bezel));
  const largest = Math.max(1e-6, ...shifts.map(Math.abs));
  const shiftAt = (d: number) => {
    const at = Math.min(steps, Math.max(0, (d / bezel) * steps));
    const i = Math.floor(at);
    const f = at - i;
    return (shifts[i] ?? 0) * (1 - f) + (shifts[Math.min(steps, i + 1)] ?? 0) * f;
  };
  const light = (shape.lightAngle * Math.PI) / 180;
  const lx = Math.cos(light);
  const ly = Math.sin(light);
  const displacement = new Uint8ClampedArray(width * height * 4);
  const specular = new Uint8ClampedArray(width * height * 4);
  const directions = [...RIM_ANGLES.map((angle) => ({ angle: angle as number | null, x: Math.cos((angle * Math.PI) / 180), y: Math.sin((angle * Math.PI) / 180) })), { angle: null, x: 0, y: 0 }];
  const rims = directions.map((direction) => ({ angle: direction.angle, data: new Uint8ClampedArray(width * height * 4) }));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + 0.5 - hw;
      const py = y + 0.5 - hh;
      const edge = roundedBox(px, py, hw, hh, radius);
      const d = -edge;
      const at = (y * width + x) * 4;
      displacement[at + 2] = 128;
      displacement[at + 3] = 255;
      specular[at] = specular[at + 1] = specular[at + 2] = 255;
      for (const rim of rims) rim.data[at] = rim.data[at + 1] = rim.data[at + 2] = 255;
      if (d <= 0 || d >= bezel) {
        displacement[at] = displacement[at + 1] = 128;
        continue;
      }
      // the outward normal of the edge here: the distance's slope
      const e = 0.5;
      let nx = roundedBox(px + e, py, hw, hh, radius) - roundedBox(px - e, py, hw, hh, radius);
      let ny = roundedBox(px, py + e, hw, hh, radius) - roundedBox(px, py - e, hw, hh, radius);
      const length = Math.hypot(nx, ny) || 1;
      nx /= length;
      ny /= length;
      // a convex bezel shows what is farther in: the pixel here takes from inwards (against the outward normal)
      const shift = shiftAt(d) / largest;
      displacement[at] = Math.round(128 - nx * shift * 127);
      displacement[at + 1] = Math.round(128 - ny * shift * 127);
      // the rim: light only on the very edge, strongest where the edge faces the light (and a little opposite)
      const facing = nx * lx + ny * ly;
      const rim = Math.pow(Math.max(0, 1 - d / Math.min(bezel, 6)), 2);
      const glance = Math.max(0, facing) + 0.35 * Math.max(0, -facing);
      specular[at + 3] = Math.round(255 * rim * glance);
      directions.forEach((direction, k) => {
        // from one side: lit where the edge faces it; from all round (null): the whole rim, evenly
        const toward = nx * direction.x + ny * direction.y;
        const lit = direction.angle === null ? 0.7 : Math.max(0, toward) + 0.25 * Math.max(0, -toward);
        rims[k]!.data[at + 3] = Math.round(255 * rim * lit);
      });
    }
  }
  return { width, height, displacement, scale: largest, specular, rims };
}

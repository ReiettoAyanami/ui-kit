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

/** What the maps are made from: a size, and the signed distance from the glass's edge at a point (negative inside). */
interface DistanceField {
  width: number;
  height: number;
  /** At a point in px from the top left corner. */
  distance: (x: number, y: number) => number;
  /** How far apart the distance is read to find the edge's direction, px (wider on a field of pixels: smoother). */
  step: number;
}

type Optics = Pick<LenziLiquidGlassShape, 'thickness' | 'ior' | 'surface' | 'lightAngle'>;

/** The maps for a glass of this shape: where each pixel is seen from, and the rim's light. */
export function liquidGlassMaps(shape: LenziLiquidGlassShape): LenziLiquidGlassMaps {
  const width = Math.max(1, Math.round(shape.width));
  const height = Math.max(1, Math.round(shape.height));
  const hw = width / 2;
  const hh = height / 2;
  const radius = Math.min(Math.max(0, shape.radius), hw, hh);
  const bezel = Math.max(1, Math.min(shape.bezel, hw, hh));
  return mapsOf({ width, height, step: 0.5, distance: (x, y) => roundedBox(x - hw, y - hh, hw, hh, radius) }, bezel, shape);
}

/**
 * A glass of any shape (lenzi, 2026-11-19: Liquid Glass on the cat): what it covers, one value a pixel from 0 (out) to
 * 255 (in), as a canvas's alpha gives it; the bezel follows its outline.
 */
export interface LenziLiquidGlassOutline extends Omit<LenziLiquidGlassShape, 'radius'> {
  inside: ArrayLike<number>;
}

/** The maps for a glass of any shape, from what it covers (its outline drawn into pixels). */
export function liquidGlassOutlineMaps(outline: LenziLiquidGlassOutline): LenziLiquidGlassMaps {
  const width = Math.max(1, Math.round(outline.width));
  const height = Math.max(1, Math.round(outline.height));
  const field = signedDistanceField(outline.inside, width, height);
  let deepest = 0;
  for (const value of field) deepest = Math.max(deepest, -value);
  const bezel = Math.max(1, Math.min(outline.bezel, deepest));
  const sample = (x: number, y: number) => {
    const fx = Math.min(width - 1, Math.max(0, x - 0.5));
    const fy = Math.min(height - 1, Math.max(0, y - 0.5));
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(width - 1, x0 + 1);
    const y1 = Math.min(height - 1, y0 + 1);
    const tx = fx - x0;
    const ty = fy - y0;
    const top = field[y0 * width + x0]! * (1 - tx) + field[y0 * width + x1]! * tx;
    const bottom = field[y1 * width + x0]! * (1 - tx) + field[y1 * width + x1]! * tx;
    return top * (1 - ty) + bottom * ty;
  };
  return mapsOf({ width, height, step: 1.5, distance: sample }, bezel, outline);
}

const FAR = 1e20;

/** The squared distance to the nearest feature along one line (Felzenszwalb and Huttenlocher's lower envelope). */
function distanceAlong(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -FAR;
  z[1] = FAR;
  for (let q = 1; q < n; q++) {
    let s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    while (s <= z[k]!) {
      k--;
      s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = FAR;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++;
    d[q] = (q - v[k]!) ** 2 + f[v[k]!]!;
  }
}

/** The squared distance of every cell to the nearest feature (0 in `grid`; FAR elsewhere), in place. */
function squaredDistances(grid: Float64Array, width: number, height: number): void {
  const longest = Math.max(width, height);
  const f = new Float64Array(longest);
  const d = new Float64Array(longest);
  const v = new Int32Array(longest);
  const z = new Float64Array(longest + 1);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = grid[y * width + x]!;
    distanceAlong(f, height, d, v, z);
    for (let y = 0; y < height; y++) grid[y * width + x] = d[y]!;
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) f[x] = grid[y * width + x]!;
    distanceAlong(f, width, d, v, z);
    for (let x = 0; x < width; x++) grid[y * width + x] = d[x]!;
  }
}

/**
 * The signed distance of every pixel's middle from the outline (negative inside), px, softened a little so the edge's
 * direction does not step with the pixels. What is past the picture's border is outside.
 */
function signedDistanceField(inside: ArrayLike<number>, width: number, height: number): Float32Array {
  // one pixel of outside all round
  const w = width + 2;
  const h = height + 2;
  const toInside = new Float64Array(w * h).fill(FAR);
  const toOutside = new Float64Array(w * h).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((inside[y * width + x] ?? 0) < 128) continue;
      toInside[(y + 1) * w + x + 1] = 0;
      toOutside[(y + 1) * w + x + 1] = FAR;
    }
  }
  squaredDistances(toInside, w, h);
  squaredDistances(toOutside, w, h);
  let field = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = (y + 1) * w + x + 1;
      field[y * width + x] = toOutside[at]! > 0 ? -(Math.sqrt(toOutside[at]!) - 0.5) : Math.sqrt(toInside[at]!) - 0.5;
    }
  }
  // two passes of a 3 × 3 average: a smoother slope, the same edge
  for (let pass = 0; pass < 2; pass++) {
    const soft = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            sum += field[ny * width + nx]!;
            count++;
          }
        }
        soft[y * width + x] = sum / count;
      }
    }
    field = soft;
  }
  return field;
}

/** The maps from a distance field: the bending in the bezel, and the rim's light on the very edge. */
function mapsOf(field: DistanceField, bezel: number, optics: Optics): LenziLiquidGlassMaps {
  const { width, height, distance, step } = field;
  // the shift at each distance from the edge, once (it depends on nothing else), and the largest
  const steps = Math.ceil(bezel * 2);
  const shifts = Array.from({ length: steps + 1 }, (_, i) => bezelShift({ ...optics, bezel }, (i / steps) * bezel));
  const largest = Math.max(1e-6, ...shifts.map(Math.abs));
  const shiftAt = (d: number) => {
    const at = Math.min(steps, Math.max(0, (d / bezel) * steps));
    const i = Math.floor(at);
    const f = at - i;
    return (shifts[i] ?? 0) * (1 - f) + (shifts[Math.min(steps, i + 1)] ?? 0) * f;
  };
  const light = (optics.lightAngle * Math.PI) / 180;
  const lx = Math.cos(light);
  const ly = Math.sin(light);
  const displacement = new Uint8ClampedArray(width * height * 4);
  const specular = new Uint8ClampedArray(width * height * 4);
  const directions = [...RIM_ANGLES.map((angle) => ({ angle: angle as number | null, x: Math.cos((angle * Math.PI) / 180), y: Math.sin((angle * Math.PI) / 180) })), { angle: null, x: 0, y: 0 }];
  const rims = directions.map((direction) => ({ angle: direction.angle, data: new Uint8ClampedArray(width * height * 4) }));
  /** One point of the glass: its shift (a vector, -1 to 1 of the largest), its light and its rims' (0 to 1); null outside. */
  const sample = (px: number, py: number) => {
    const d = -distance(px, py);
    if (d <= 0 || d >= bezel) return null;
    // the outward normal of the edge here: the distance's slope
    let nx = distance(px + step, py) - distance(px - step, py);
    let ny = distance(px, py + step) - distance(px, py - step);
    const length = Math.hypot(nx, ny) || 1;
    nx /= length;
    ny /= length;
    // a convex bezel shows what is farther in: the point here takes from inwards (against the outward normal)
    const shift = shiftAt(d) / largest;
    // the rim: light only on the very edge, strongest where the edge faces the light (and a little opposite)
    const facing = nx * lx + ny * ly;
    const rim = Math.pow(Math.max(0, 1 - d / Math.min(bezel, 6)), 2);
    // the whole edge a little, most where it faces the light, much on the other side too (kube.io's, Apple's)
    const glance = 0.3 + 0.7 * Math.max(0, facing) + 0.45 * Math.max(0, -facing);
    return {
      sx: -nx * shift,
      sy: -ny * shift,
      specular: rim * glance,
      rims: directions.map((direction) => {
        // from one side: lit where the edge faces it; from all round (null): the whole rim, evenly
        const toward = nx * direction.x + ny * direction.y;
        return rim * (direction.angle === null ? 0.7 : Math.max(0, toward) + 0.25 * Math.max(0, -toward));
      }),
    };
  };
  // A pixel the outline crosses is four points averaged (lenzi, 2026-11-25: "attiva antialiasing"): its rim and its
  // bending fade with how much of it is glass, instead of a staircase round the corners.
  const SUB = [-0.25, 0.25];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const at = (y * width + x) * 4;
      displacement[at + 2] = 128;
      displacement[at + 3] = 255;
      specular[at] = specular[at + 1] = specular[at + 2] = 255;
      for (const rim of rims) rim.data[at] = rim.data[at + 1] = rim.data[at + 2] = 255;
      const d = -distance(px, py);
      const edge = Math.abs(d) < 1;
      const points = edge ? SUB.flatMap((oy) => SUB.map((ox) => sample(px + ox, py + oy))) : [sample(px, py)];
      let sx = 0;
      let sy = 0;
      let lit = 0;
      const rimLight = new Array<number>(rims.length).fill(0);
      for (const point of points) {
        if (!point) continue;
        sx += point.sx;
        sy += point.sy;
        lit += point.specular;
        point.rims.forEach((value, k) => (rimLight[k]! += value));
      }
      const n = points.length;
      displacement[at] = Math.round(128 + (sx / n) * 127);
      displacement[at + 1] = Math.round(128 + (sy / n) * 127);
      specular[at + 3] = Math.round((255 * lit) / n);
      rimLight.forEach((value, k) => (rims[k]!.data[at + 3] = Math.round((255 * value) / n)));
    }
  }
  return { width, height, displacement, scale: largest, specular, rims };
}

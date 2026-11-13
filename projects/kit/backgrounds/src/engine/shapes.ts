// The shapes of the blobs: soft, rounded, a little playful, like Material 3 Expressive's (lenzi,
// 2026-11-13: "supershapes like the ones that materialui uses"): a circle, a squircle, rounded
// polygons, clovers, cookies with scalloped edges, suns. Each is a radius for every direction
// around its centre: Gielis's superformula (the rounded polygons) times a scallop (the lobes). A blob
// turns from one shape into another by mixing the two radii, so it never tears. The same formula is
// in the blobs' shader (blob-shader.ts): `shapeRadius` here is its twin, for the tests and for a
// fallback. A plain module (no schematic makes one).

/** One shape, as the numbers of its radius. */
export interface BlobShape {
  /** Superformula: the corners (0: a circle), and how round they are (n1) and how the sides bend (n2, n3). */
  m: number;
  n1: number;
  n2: number;
  n3: number;
  /** Scallop: how many lobes around, how deep the dips between them (0: none, 1: to the centre), how pointed. */
  lobes: number;
  depth: number;
  sharp: number;
}

const plain = { m: 0, n1: 2, n2: 2, n3: 2, lobes: 0, depth: 0, sharp: 1 };

export const BLOB_SHAPES = {
  circle: { ...plain },
  squircle: { ...plain, m: 4, n1: 4, n2: 4, n3: 4 },
  triangle: { ...plain, m: 3, n1: 3.2, n2: 5, n3: 5 },
  pentagon: { ...plain, m: 5, n1: 5, n2: 6.5, n3: 6.5 },
  hexagon: { ...plain, m: 6, n1: 9, n2: 8, n3: 8 },
  clover4: { ...plain, lobes: 4, depth: 0.34, sharp: 1 },
  clover8: { ...plain, lobes: 8, depth: 0.2, sharp: 1 },
  flower: { ...plain, lobes: 6, depth: 0.3, sharp: 0.7 },
  cookie6: { ...plain, lobes: 6, depth: 0.13, sharp: 1 },
  cookie9: { ...plain, lobes: 9, depth: 0.1, sharp: 1 },
  cookie12: { ...plain, lobes: 12, depth: 0.08, sharp: 1 },
  sunny: { ...plain, lobes: 8, depth: 0.22, sharp: 1.8 },
  burst: { ...plain, lobes: 12, depth: 0.26, sharp: 2.4 },
} as const satisfies Record<string, BlobShape>;

export type BlobShapeName = keyof typeof BLOB_SHAPES;
export const BLOB_SHAPE_NAMES = Object.keys(BLOB_SHAPES) as BlobShapeName[];

/** What a blob background turns its blobs into, unless told otherwise. */
export const DEFAULT_BLOB_SHAPES: BlobShapeName[] = ['circle', 'squircle', 'clover4', 'cookie9', 'flower', 'sunny', 'pentagon'];

/**
 * How far the superformula reaches at its widest, with n2 = n3 (every shape here: it also makes the
 * radius the same all the way round for an odd number of corners).
 */
export function superReach(shape: BlobShape): number {
  return shape.m > 0 ? Math.max(1, 2 ** ((shape.n2 / 2 - 1) / shape.n1)) : 1;
}

/**
 * The radius of a shape in the direction `angle` (radians), where 1 is its widest reach.
 * The shader's `shapeRadius` is the same formula.
 */
export function shapeRadius(shape: BlobShape, angle: number): number {
  let radius = 1;
  if (shape.m > 0) {
    const t = (shape.m * angle) / 4;
    const sum = Math.abs(Math.cos(t)) ** shape.n2 + Math.abs(Math.sin(t)) ** shape.n3;
    // its widest reach (a corner, where cos and sin are equal) brought back to 1
    radius = sum ** (-1 / shape.n1) / superReach(shape);
  }
  if (shape.lobes > 0 && shape.depth > 0) {
    radius *= 1 - shape.depth * (0.5 - 0.5 * Math.cos(shape.lobes * angle)) ** shape.sharp;
  }
  return radius;
}

/** The names that are shapes, in the order given; the default ones when none is. */
export function knownShapes(names: readonly string[] | null | undefined): BlobShapeName[] {
  const known = (names ?? []).filter((name): name is BlobShapeName => name in BLOB_SHAPES);
  return known.length ? known : DEFAULT_BLOB_SHAPES;
}

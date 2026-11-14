// Where the blobs are and what shape each has, at a moment: they drift on slow loops that cross (so
// they meet and merge), breathe, turn, and change from one shape into another. Nothing is kept from
// frame to frame: the same moment always gives the same picture, so a still frame (reduced motion) is
// just a moment. Pure numbers; the blob scene draws them. A plain module (no schematic makes one).

import { seeded } from './color';
import { BLOB_SHAPES, BlobShape, BlobShapeName, shapeRadius, superReach } from './shapes';

/** The most blobs a background holds (the shader's arrays). */
export const MAX_BLOBS = 16;

export interface BlobSettings {
  count: number;
  /** A blob's radius, as a share of the smaller side of the space (0.2: a fifth of it). */
  size: number;
  /** How much the blobs differ in size, 0 (all the same) to 1. */
  sizeVariety: number;
  /** How far a blob wanders from its place, as a share of the space, 0 to 1. */
  travel: number;
  /** How fast the shapes change into one another: 0 never, 1 about every 6 seconds. */
  morph: number;
  /** How fast they turn, in turns a minute (some one way, some the other). */
  spin: number;
  /** The shapes they take. */
  shapes: readonly BlobShapeName[];
  /** How much the pointer draws them, 0 (not at all) to 1. */
  pull: number;
  seed: number;
  /**
   * Each blob's size of its own, as `size` is (a share of the smaller side), in order and round again; none:
   * `size` and `sizeVariety` (lenzi, 2026-11-14: "un blob grande, un/due blob piccoli dello stesso materiale").
   */
  sizes?: readonly number[];
}

export const DEFAULT_BLOBS: BlobSettings = {
  count: 6,
  size: 0.2,
  sizeVariety: 0.45,
  travel: 0.6,
  morph: 0.5,
  spin: 1.2,
  shapes: ['circle', 'squircle', 'clover4', 'cookie9', 'flower', 'sunny', 'pentagon'],
  pull: 0,
  seed: 1,
};

/** One blob at a moment: what the shader needs. */
export interface BlobState {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  from: BlobShape;
  to: BlobShape;
  /** 0: all `from`; 1: all `to`. */
  mix: number;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** The blobs at `time` seconds, in a space `width` × `height` CSS px. */
export function blobsAt(settings: BlobSettings, time: number, width: number, height: number, pointer: { x: number; y: number } | null = null): BlobState[] {
  const count = Math.max(0, Math.min(MAX_BLOBS, Math.floor(settings.count)));
  const side = Math.min(width, height);
  const shapes = settings.shapes.length ? settings.shapes : DEFAULT_BLOBS.shapes;
  const blobs: BlobState[] = [];
  for (let i = 0; i < count; i++) {
    // everything a blob is comes from its number and the seed
    const random = seeded(Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(settings.seed, 0xc2b2ae35));
    const homeX = 0.15 + 0.7 * random();
    const homeY = 0.15 + 0.7 * random();
    const reach = settings.travel * 0.4;
    // two slow loops on each axis, never in step: a path that does not repeat for a long time
    const loop = (amplitude: number) => {
      const a = Math.sin(time * (0.11 + 0.13 * random()) + random() * 6.283);
      const b = Math.sin(time * (0.05 + 0.07 * random()) + random() * 6.283);
      return amplitude * (0.65 * a + 0.35 * b);
    };
    let x = (homeX + loop(reach)) * width;
    let y = (homeY + loop(reach)) * height;
    const breath = 1 + 0.05 * Math.sin(time * (0.3 + 0.3 * random()) + random() * 6.283);
    // the same random numbers drawn either way: a list of sizes moves no blob
    const varied = settings.size * (1 - settings.sizeVariety * 0.6 * random());
    const own = settings.sizes?.length ? settings.sizes[i % settings.sizes.length]! : varied;
    const radius = own * side * breath;
    const direction = random() < 0.5 ? -1 : 1;
    const rotation = random() * 6.283 + direction * time * ((settings.spin * Math.PI * 2) / 60) * (0.5 + random());

    // the shape it has and the one it is turning into: a new one every period, changing in its last part
    const first = Math.floor(random() * shapes.length);
    const offset = random();
    let from = first;
    let to = first;
    let mix = 0;
    if (settings.morph > 0 && shapes.length > 1) {
      const period = 6 / settings.morph;
      const clock = time / period + offset;
      const turn = Math.floor(clock);
      const pick = (n: number) => (first + Math.floor(seeded(Math.imul(n + 7, 0x27d4eb2f) ^ (i * 977))() * (shapes.length - 1) + 1) * n) % shapes.length;
      from = pick(turn);
      to = pick(turn + 1);
      mix = smooth(Math.min(1, Math.max(0, ((clock - turn) - 0.55) / 0.45)));
    }

    if (pointer && settings.pull > 0) {
      // drawn by the pointer, the near ones more
      const dx = pointer.x - x;
      const dy = pointer.y - y;
      const near = 1 / (1 + Math.hypot(dx, dy) / (side * 0.6));
      x += dx * settings.pull * 0.6 * near;
      y += dy * settings.pull * 0.6 * near;
    }
    blobs.push({ x, y, radius, rotation, from: BLOB_SHAPES[shapes[from]!], to: BLOB_SHAPES[shapes[to]!], mix });
  }
  return blobs;
}

/**
 * How far a point is from the blobs' edge, CSS px, below 0 inside: the edge the blob scene draws (each
 * blob's shape in its direction, turned and half way between its two shapes; joined softly by `merge`
 * px, so where two blobs melt into one the gap between them is inside too). The flock flies round it.
 */
export function blobEdge(blobs: readonly BlobState[], merge: number): (x: number, y: number) => number {
  const k = Math.max(merge, 1);
  return (x, y) => {
    let weights = 0;
    let nearest = Infinity;
    for (const blob of blobs) {
      const dx = x - blob.x;
      const dy = y - blob.y;
      const far = Math.hypot(dx, dy);
      nearest = Math.min(nearest, far - blob.radius);
      // too far to matter (as in the shader)
      if (far > blob.radius + k * 12) continue;
      const angle = Math.atan2(dy, dx) + blob.rotation;
      const radius = (shapeRadius(blob.from, angle) * (1 - blob.mix) + shapeRadius(blob.to, angle) * blob.mix) * blob.radius;
      weights += Math.exp(Math.min((radius - far) / k, 60));
    }
    return weights > 0 ? -k * Math.log(weights) : nearest;
  };
}

/** A shape as the shader takes it: (m, n1, n2, its reach) and (lobes, depth, sharp). */
export function shapeUniforms(shape: BlobShape): [number, number, number, number, number, number, number] {
  return [shape.m, shape.n1, shape.n2, superReach(shape), shape.lobes, shape.depth, shape.sharp];
}

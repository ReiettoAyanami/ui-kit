// Currents (lenzi, 2026-11-14: "vorrei che i boidi possano seguire una corrente (definita da una serie di segmenti,
// con ognuno le sue forze indipendenti) che instrada i boidi e i blob verso la direzione del segmento (tipo una
// corrente marina)"): a line of segments; near a segment, things are pushed along it, by that segment's own strength,
// less the farther they are from its line. Pure numbers. A plain module (no schematic makes one).

/** A current: its points in order (each a share of the space, 0 to 1 each way), a segment between each two. */
export interface LenziCurrent {
  points: readonly { x: number; y: number }[];
  /** Each segment's push, px/s², in order; past the list, the last one's (DEFAULT_CURRENT.strength when none). */
  strengths?: readonly number[];
  /** How far from its line it reaches, as a share of the space's shorter side. */
  width?: number;
}

export const DEFAULT_CURRENT = { strength: 160, width: 0.08 } as const;

/** How much of a current's push a blob takes (it is heavier than a boid), and how fast its drift slows, per second. */
const BLOB_SHARE = 0.35;
const BLOB_DRAG = 0.8;

/**
 * Blobs carried by currents ("instrada i boidi e i blob"): each keeps a drift of its own, pushed by the current where it
 * is and slowly slowed, added to where its own path puts it; out on one side, back in on the other.
 */
export class BlobDrift {
  private drifts: { x: number; y: number; vx: number; vy: number }[] = [];

  /** Every blob back on its own path (no current, or a scene being made). */
  reset(): void {
    this.drifts = [];
  }

  /**
   * One step of `dt` seconds for blobs where their paths put them: each pushed by its share of the flow (`carried`:
   * 0 for a blob that stays put, less for a heavier one).
   */
  step(dt: number, blobs: readonly { x: number; y: number }[], flow: ((x: number, y: number) => readonly [number, number]) | null, carried: (index: number) => number): void {
    const drag = Math.exp(-BLOB_DRAG * dt);
    blobs.forEach((blob, i) => {
      const drift = (this.drifts[i] ??= { x: 0, y: 0, vx: 0, vy: 0 });
      const share = carried(i) * BLOB_SHARE;
      if (flow && share > 0) {
        const [fx, fy] = flow(blob.x + drift.x, blob.y + drift.y);
        drift.vx += fx * share * dt;
        drift.vy += fy * share * dt;
      }
      drift.vx *= drag;
      drift.vy *= drag;
      drift.x += drift.vx * dt;
      drift.y += drift.vy * dt;
    });
    this.drifts.length = Math.min(this.drifts.length, blobs.length);
  }

  /** The blobs moved by their drifts, back in on the other side when out (by their own size). */
  apply<T extends { x: number; y: number; radius: number }>(blobs: readonly T[], width: number, height: number): T[] {
    if (this.drifts.length === 0) return [...blobs];
    const wrap = (value: number, size: number, margin: number) => ((((value + margin) % (size + 2 * margin)) + size + 2 * margin) % (size + 2 * margin)) - margin;
    return blobs.map((blob, i) => {
      const drift = this.drifts[i];
      if (!drift || (drift.x === 0 && drift.y === 0)) return blob;
      return { ...blob, x: wrap(blob.x + drift.x, width, blob.radius), y: wrap(blob.y + drift.y, height, blob.radius) };
    });
  }
}

/** One segment as the push is reckoned: from a to b (px), its way, its length, its push and reach. */
interface Segment {
  ax: number;
  ay: number;
  dx: number;
  dy: number;
  length: number;
  strength: number;
  reach: number;
}

/** A segment's push at a distance from its line, as a share of the whole: all of it on the line, none at its reach. */
const falloff = (distance: number, reach: number) => {
  if (distance >= reach) return 0;
  const k = 1 - distance / reach;
  return k * k * (3 - 2 * k);
};

/**
 * The push of some currents at every place of a space `width` × `height` px, px/s²: along each segment near it (the
 * nearest segments of each current add up), none far from them all. Null when there are none.
 */
export function currentsFlow(currents: readonly LenziCurrent[], width: number, height: number): ((x: number, y: number) => readonly [number, number]) | null {
  const side = Math.min(width, height);
  const segments: Segment[] = [];
  for (const current of currents) {
    const reach = Math.max(1, (current.width ?? DEFAULT_CURRENT.width) * side);
    for (let i = 0; i + 1 < current.points.length; i++) {
      const a = current.points[i]!;
      const b = current.points[i + 1]!;
      const ax = a.x * width;
      const ay = a.y * height;
      const dx = b.x * width - ax;
      const dy = b.y * height - ay;
      const length = Math.hypot(dx, dy);
      if (length < 1) continue;
      const strengths = current.strengths ?? [];
      const strength = strengths[Math.min(i, strengths.length - 1)] ?? DEFAULT_CURRENT.strength;
      segments.push({ ax, ay, dx: dx / length, dy: dy / length, length, strength, reach });
    }
  }
  if (segments.length === 0) return null;
  return (x, y) => {
    let fx = 0;
    let fy = 0;
    for (const s of segments) {
      // the nearest place on the segment
      const along = Math.min(s.length, Math.max(0, (x - s.ax) * s.dx + (y - s.ay) * s.dy));
      const distance = Math.hypot(x - (s.ax + s.dx * along), y - (s.ay + s.dy * along));
      const push = s.strength * falloff(distance, s.reach);
      if (push <= 0) continue;
      fx += s.dx * push;
      fy += s.dy * push;
    }
    return [fx, fy] as const;
  };
}

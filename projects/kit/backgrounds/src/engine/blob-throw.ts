// Blobs a hand can throw (lenzi, 2026-11-14: "make the user able to drag the blobs around ... kinda like
// throwing them around"): each blob keeps an offset from where its own slow path would put it. Grabbed, the
// offset follows the pointer; let go, the blob flies on with the pointer's speed, slows down, bounces off
// the edges, and is drawn back to its path little by little. Pure numbers; the backgrounds wire the
// pointer. A plain module (no schematic makes one).

import { BlobState } from './blob-field';
import { shapeRadius } from './shapes';

/** How fast a thrown blob slows down: its speed is divided by e every 1 / FRICTION seconds. */
const FRICTION = 1.1;
/** Two blobs that meet slower than this (px/s) do not bounce: they rest against each other. */
const REST = 40;
/** How many times the pairs are gone through in one step: a blob pushed out of one may be pushed into another. */
const PASSES = 3;

/** How far a blob reaches from its middle in a direction of the screen (radians), px: its shape now, turned. */
function reachOf(blob: BlobState, angle: number): number {
  const own = angle + blob.rotation;
  return (shapeRadius(blob.from, own) * (1 - blob.mix) + shapeRadius(blob.to, own) * blob.mix) * blob.radius;
}
/** How strongly a let-go blob is drawn back to its own path (a spring, per second²). */
const SPRING = 0.35;
/** How hard it can be thrown, px/s. */
const FASTEST = 2400;
/** How much of its speed a blob keeps when it bounces off an edge. */
const BOUNCE = 0.7;

interface Hold {
  index: number;
  /** Where the pointer took it, from its middle. */
  dx: number;
  dy: number;
  /** The pointer's last places, for the speed it is let go with. */
  trail: { x: number; y: number; t: number }[];
}

export class BlobThrow {
  private ox: number[] = [];
  private oy: number[] = [];
  private vx: number[] = [];
  private vy: number[] = [];
  private hold: Hold | null = null;
  /** Where the held blob should be, the pointer's place (CSS px of the space). */
  private pointer: { x: number; y: number } | null = null;

  /** Whether a blob is held now. */
  get holding(): boolean {
    return this.hold !== null;
  }

  /** The blob held now (its place in the list), or -1. */
  get held(): number {
    return this.hold?.index ?? -1;
  }

  /** Every blob back on its own path, none held (nothing may be thrown: a scene being made). */
  reset(): void {
    this.ox = [];
    this.oy = [];
    this.vx = [];
    this.vy = [];
    this.hold = null;
    this.pointer = null;
  }

  /** The blob under a point (as drawn, with its offset), the one on top first; -1: none. */
  blobAt(blobs: readonly BlobState[], x: number, y: number): number {
    for (let i = blobs.length - 1; i >= 0; i--) {
      const blob = blobs[i]!;
      if (Math.hypot(x - blob.x, y - blob.y) < blob.radius * 0.9) return i;
    }
    return -1;
  }

  /** Takes the blob under a point (blobs as drawn); false when there is none. */
  grab(blobs: readonly BlobState[], x: number, y: number, time: number): boolean {
    const index = this.blobAt(blobs, x, y);
    if (index < 0) return false;
    this.ensure(blobs.length);
    const blob = blobs[index]!;
    this.hold = { index, dx: x - blob.x, dy: y - blob.y, trail: [{ x, y, t: time }] };
    this.pointer = { x, y };
    this.vx[index] = 0;
    this.vy[index] = 0;
    return true;
  }

  /** The pointer moved, holding a blob. */
  drag(x: number, y: number, time: number): void {
    if (!this.hold) return;
    this.pointer = { x, y };
    this.hold.trail.push({ x, y, t: time });
    // the last tenth of a second says how fast it is thrown
    while (this.hold.trail.length > 2 && time - this.hold.trail[0]!.t > 0.1) this.hold.trail.shift();
  }

  /** Let go: it flies on with the pointer's speed of the last moment. */
  release(time: number): void {
    const hold = this.hold;
    if (!hold) return;
    const first = hold.trail[0]!;
    const last = hold.trail[hold.trail.length - 1]!;
    const span = Math.max(1 / 120, time - first.t);
    let vx = (last.x - first.x) / span;
    let vy = (last.y - first.y) / span;
    const speed = Math.hypot(vx, vy);
    if (speed > FASTEST) {
      vx = (vx / speed) * FASTEST;
      vy = (vy / speed) * FASTEST;
    }
    // a pointer that stopped before letting go drops it
    if (time - last.t > 0.12) vx = vy = 0;
    this.vx[hold.index] = vx;
    this.vy[hold.index] = vy;
    this.hold = null;
    this.pointer = null;
  }

  /**
   * Time goes on by `dt` seconds. `paths` are the blobs where their own paths put them now (without the
   * offsets), in a space `width` × `height`.
   */
  step(dt: number, paths: readonly BlobState[], width: number, height: number): void {
    this.ensure(paths.length);
    const keep = Math.exp(-FRICTION * dt);
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i]!;
      if (this.hold?.index === i && this.pointer) {
        // held: where the pointer is
        this.ox[i] = this.pointer.x - this.hold.dx - path.x;
        this.oy[i] = this.pointer.y - this.hold.dy - path.y;
        continue;
      }
      this.vx[i] = (this.vx[i]! - SPRING * this.ox[i]! * dt) * keep;
      this.vy[i] = (this.vy[i]! - SPRING * this.oy[i]! * dt) * keep;
      this.ox[i] = this.ox[i]! + this.vx[i]! * dt;
      this.oy[i] = this.oy[i]! + this.vy[i]! * dt;
      // the edges: half of it may go past them, then it bounces back
      const margin = path.radius * 0.5;
      const x = path.x + this.ox[i]!;
      const y = path.y + this.oy[i]!;
      if (x < margin || x > width - margin) {
        this.ox[i] = Math.min(width - margin, Math.max(margin, x)) - path.x;
        this.vx[i] = -this.vx[i]! * BOUNCE;
      }
      if (y < margin || y > height - margin) {
        this.oy[i] = Math.min(height - margin, Math.max(margin, y)) - path.y;
        this.vy[i] = -this.vy[i]! * BOUNCE;
      }
    }
  }

  /**
   * Blobs that bounce off one another (lenzi, 2026-11-15: "a toggle that decides if a blob is an obstacle for the same
   * z-level or not, so some blobs will be able to collide too"). `blobs` are where they are now, as drawn; `bumps`
   * says whether two may not overlap; `mass` how hard one is to push (0: it is not pushed, made fast; the held one is
   * not either). Two that overlap, each as far as its shape reaches towards the other, are pushed apart along the
   * line between them, the lighter one more; what they were flying at each other with is turned back, some of it
   * lost (none of it turned back when they meet slowly: they rest against each other).
   */
  collide(blobs: readonly BlobState[], bumps: (one: number, other: number) => boolean, mass: (index: number) => number): void {
    this.ensure(blobs.length);
    const x = blobs.map((blob) => blob.x);
    const y = blobs.map((blob) => blob.y);
    // how easily each is pushed: nothing pushes the held one or one made fast
    const give = blobs.map((_, i) => (this.hold?.index === i || !(mass(i) > 0) ? 0 : 1 / mass(i)));
    for (let pass = 0; pass < PASSES; pass++) {
      let touched = false;
      for (let a = 0; a < blobs.length; a++) {
        for (let b = a + 1; b < blobs.length; b++) {
          const both = give[a]! + give[b]!;
          if (both <= 0 || !bumps(a, b)) continue;
          const dx = x[b]! - x[a]!;
          const dy = y[b]! - y[a]!;
          const far = Math.hypot(dx, dy);
          // farther apart than both at their widest
          if (far >= blobs[a]!.radius + blobs[b]!.radius) continue;
          const angle = far > 1e-6 ? Math.atan2(dy, dx) : 0;
          const over = reachOf(blobs[a]!, angle) + reachOf(blobs[b]!, angle + Math.PI) - far;
          if (over <= 0) continue;
          touched = true;
          const nx = Math.cos(angle);
          const ny = Math.sin(angle);
          const pushA = (over * give[a]!) / both;
          const pushB = (over * give[b]!) / both;
          x[a] = x[a]! - nx * pushA;
          y[a] = y[a]! - ny * pushA;
          x[b] = x[b]! + nx * pushB;
          y[b] = y[b]! + ny * pushB;
          this.ox[a] = this.ox[a]! - nx * pushA;
          this.oy[a] = this.oy[a]! - ny * pushA;
          this.ox[b] = this.ox[b]! + nx * pushB;
          this.oy[b] = this.oy[b]! + ny * pushB;
          // the speed they close in with, along the line between them
          const closing = (this.vx[b]! - this.vx[a]!) * nx + (this.vy[b]! - this.vy[a]!) * ny;
          if (closing >= 0) continue;
          const impulse = (-(1 + (-closing > REST ? BOUNCE : 0)) * closing) / both;
          this.vx[a] = this.vx[a]! - impulse * give[a]! * nx;
          this.vy[a] = this.vy[a]! - impulse * give[a]! * ny;
          this.vx[b] = this.vx[b]! + impulse * give[b]! * nx;
          this.vy[b] = this.vy[b]! + impulse * give[b]! * ny;
        }
      }
      if (!touched) break;
    }
  }

  /** The blobs where they are: their paths moved by their offsets. */
  apply(paths: readonly BlobState[]): BlobState[] {
    return paths.map((blob, i) => (this.ox[i] || this.oy[i] ? { ...blob, x: blob.x + this.ox[i]!, y: blob.y + this.oy[i]! } : blob));
  }

  private ensure(count: number): void {
    while (this.ox.length < count) {
      this.ox.push(0);
      this.oy.push(0);
      this.vx.push(0);
      this.vy.push(0);
    }
  }
}

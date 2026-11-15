// Blobs a hand can throw (lenzi, 2026-11-14: "make the user able to drag the blobs around ... kinda like
// throwing them around"): each blob keeps an offset from where its own slow path would put it. Grabbed, the
// offset follows the pointer; let go, the blob flies on with the pointer's speed, slows down, bounces off
// the edges, and is drawn back to its path little by little. Pure numbers; the backgrounds wire the
// pointer. A plain module (no schematic makes one).

import { BlobState } from './blob-field';

/** How fast a thrown blob slows down: its speed is divided by e every 1 / FRICTION seconds. */
const FRICTION = 1.1;
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

// A flock: boids (Craig Reynolds, 1987). Every boid steers by three rules about the boids it sees
// around it (keep apart, head the same way, stay together), and here also towards a target, the
// pointer (lenzi, 2026-11-13: "The flocks need to be following the mouse (either approximately or like
// a precise target), need to behave like a normal flocking animation and every variable should be
// configurable"). Pure numbers, no drawing: the flock background draws it, the tests run it without
// a screen. Lengths in CSS px, speeds in px a second. A plain module (no schematic makes one).

import { seeded } from './color';

/** How the flock follows the target: not at all; around it, loosely; onto it, slowing to a stop. */
export type BoidsFollow = 'none' | 'near' | 'target';

export interface BoidsSettings {
  /** How many boids. */
  count: number;
  /** The fastest and the slowest a boid flies, px/s. A boid never stops, unless it has arrived on its target. */
  maxSpeed: number;
  minSpeed: number;
  /** How hard it can turn or push, px/s²: small is lazy and wide, large is nervous. */
  maxForce: number;
  /** How far it sees the others, px. */
  perception: number;
  /** How wide it sees, in degrees around its heading: 360 sees behind too. */
  viewAngle: number;
  /** Closer than this, px, it moves away. */
  separationDistance: number;
  /** The weight of each rule: keep apart, head the same way, stay together. */
  separation: number;
  alignment: number;
  cohesion: number;
  follow: BoidsFollow;
  /** The weight of the target. */
  followWeight: number;
  /** "near": inside this distance from the target, px, the pull fades (they mill around it). "target": inside it they slow down to stop on it. */
  followRadius: number;
  /** How much each boid turns by itself, at random: 0 none. */
  wander: number;
  /** At the edges: come back in from the other side, or turn away before them. */
  edges: 'wrap' | 'avoid';
  /** "avoid": how far from an edge, px, it starts turning. */
  edgeMargin: number;
}

export const DEFAULT_BOIDS: BoidsSettings = {
  count: 240,
  maxSpeed: 150,
  minSpeed: 60,
  maxForce: 220,
  perception: 70,
  viewAngle: 270,
  separationDistance: 26,
  separation: 1.6,
  alignment: 1,
  cohesion: 0.9,
  follow: 'near',
  followWeight: 0.9,
  followRadius: 140,
  wander: 0.25,
  edges: 'wrap',
  edgeMargin: 80,
};

/** The most boids a flock holds: beyond this a CPU flock is not smooth. */
export const MAX_BOIDS = 4000;

export class Boids {
  x = new Float32Array(0);
  y = new Float32Array(0);
  vx = new Float32Array(0);
  vy = new Float32Array(0);

  private settings: BoidsSettings;
  private width: number;
  private height: number;
  private target: { x: number; y: number } | null = null;
  private readonly random: () => number;
  // the space in cells as wide as a boid sees: only the boids of the cells around are looked at
  private cellOf = new Int32Array(0);
  private cellStart = new Int32Array(0);
  private sorted = new Int32Array(0);
  private ax = new Float32Array(0);
  private ay = new Float32Array(0);
  /** On its target: it may stop. */
  private arrived = new Uint8Array(0);

  constructor(settings: Partial<BoidsSettings>, width: number, height: number, seed = 1) {
    this.settings = { ...DEFAULT_BOIDS, ...settings };
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.random = seeded(seed);
    this.populate(this.settings.count);
  }

  get count(): number {
    return this.x.length;
  }

  /** New settings: the boids there stay where they are; more or fewer when the count changes. */
  configure(settings: Partial<BoidsSettings>): void {
    this.settings = { ...this.settings, ...settings };
    if (this.settings.count !== this.count) this.populate(this.settings.count);
  }

  /** The space changed size: the boids keep their place in it, in proportion. */
  resize(width: number, height: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    for (let i = 0; i < this.count; i++) {
      this.x[i] = (this.x[i]! / this.width) * w;
      this.y[i] = (this.y[i]! / this.height) * h;
    }
    this.width = w;
    this.height = h;
  }

  /** Where the flock goes (the pointer), or nowhere. */
  setTarget(target: { x: number; y: number } | null): void {
    this.target = target;
  }

  private populate(wanted: number): void {
    const count = Math.max(0, Math.min(MAX_BOIDS, Math.floor(wanted)));
    const kept = Math.min(count, this.count);
    const grow = (old: Float32Array) => {
      const next = new Float32Array(count);
      next.set(old.subarray(0, kept));
      return next;
    };
    this.x = grow(this.x);
    this.y = grow(this.y);
    this.vx = grow(this.vx);
    this.vy = grow(this.vy);
    const speed = (this.settings.minSpeed + this.settings.maxSpeed) / 2;
    for (let i = kept; i < count; i++) {
      const heading = this.random() * Math.PI * 2;
      this.x[i] = this.random() * this.width;
      this.y[i] = this.random() * this.height;
      this.vx[i] = Math.cos(heading) * speed;
      this.vy[i] = Math.sin(heading) * speed;
    }
    this.cellOf = new Int32Array(count);
    this.sorted = new Int32Array(count);
    this.ax = new Float32Array(count);
    this.ay = new Float32Array(count);
    this.arrived = new Uint8Array(count);
  }

  /** One step of `dt` seconds: every boid looks around, steers, moves. */
  step(dt: number): void {
    const s = this.settings;
    const n = this.count;
    if (n === 0 || dt <= 0) return;
    const { x, y, vx, vy, ax, ay, width, height } = this;
    const wrap = s.edges === 'wrap';
    const see = Math.max(1, s.perception);
    const see2 = see * see;
    const apart = Math.max(0, s.separationDistance);
    const cosHalfView = s.viewAngle >= 360 ? -2 : Math.cos((Math.max(0, s.viewAngle) * Math.PI) / 360);

    // 1. the boids by cell
    const columns = Math.max(1, Math.floor(width / see));
    const rows = Math.max(1, Math.floor(height / see));
    const cellW = width / columns;
    const cellH = height / rows;
    if (this.cellStart.length !== columns * rows + 1) this.cellStart = new Int32Array(columns * rows + 1);
    const { cellOf, cellStart, sorted } = this;
    cellStart.fill(0);
    for (let i = 0; i < n; i++) {
      const cx = Math.min(columns - 1, Math.max(0, Math.floor(x[i]! / cellW)));
      const cy = Math.min(rows - 1, Math.max(0, Math.floor(y[i]! / cellH)));
      cellOf[i] = cy * columns + cx;
      cellStart[cellOf[i]! + 1]!++;
    }
    for (let c = 0; c < columns * rows; c++) cellStart[c + 1]! += cellStart[c]!;
    const fill = cellStart.slice(0, columns * rows);
    for (let i = 0; i < n; i++) sorted[fill[cellOf[i]!]!++] = i;

    // 2. what every boid wants
    for (let i = 0; i < n; i++) {
      const px = x[i]!;
      const py = y[i]!;
      const hx = vx[i]!;
      const hy = vy[i]!;
      const speed = Math.hypot(hx, hy) || 1;
      let awayX = 0;
      let awayY = 0;
      let headX = 0;
      let headY = 0;
      let centreX = 0;
      let centreY = 0;
      let seen = 0;
      const cx = cellOf[i]! % columns;
      const cy = (cellOf[i]! - cx) / columns;
      for (let oy = -1; oy <= 1; oy++) {
        let ny = cy + oy;
        if (ny < 0 || ny >= rows) {
          if (!wrap || rows < 3) continue;
          ny = (ny + rows) % rows;
        }
        for (let ox = -1; ox <= 1; ox++) {
          let nx = cx + ox;
          if (nx < 0 || nx >= columns) {
            if (!wrap || columns < 3) continue;
            nx = (nx + columns) % columns;
          }
          const cell = ny * columns + nx;
          for (let k = cellStart[cell]!; k < cellStart[cell + 1]!; k++) {
            const j = sorted[k]!;
            if (j === i) continue;
            let dx = x[j]! - px;
            let dy = y[j]! - py;
            if (wrap) {
              // the nearest way round
              if (dx > width / 2) dx -= width;
              else if (dx < -width / 2) dx += width;
              if (dy > height / 2) dy -= height;
              else if (dy < -height / 2) dy += height;
            }
            const d2 = dx * dx + dy * dy;
            if (d2 > see2 || d2 === 0) continue;
            const d = Math.sqrt(d2);
            if ((hx * dx + hy * dy) / (speed * d) < cosHalfView) continue;
            seen++;
            headX += vx[j]!;
            headY += vy[j]!;
            centreX += dx;
            centreY += dy;
            if (d < apart) {
              const push = 1 - d / apart;
              awayX -= (dx / d) * push;
              awayY -= (dy / d) * push;
            }
          }
        }
      }

      let fx = 0;
      let fy = 0;
      /** The push that turns the boid towards a direction, at a speed, no harder than it can. */
      const steer = (towardX: number, towardY: number, weight: number, atSpeed = s.maxSpeed, force = s.maxForce) => {
        const length = Math.hypot(towardX, towardY);
        if (length < 1e-6 || weight === 0) return;
        let sx = (towardX / length) * atSpeed - hx;
        let sy = (towardY / length) * atSpeed - hy;
        const size = Math.hypot(sx, sy);
        if (size > force) {
          sx = (sx / size) * force;
          sy = (sy / size) * force;
        }
        fx += sx * weight;
        fy += sy * weight;
      };
      if (seen > 0) {
        steer(awayX, awayY, s.separation);
        steer(headX, headY, s.alignment);
        steer(centreX, centreY, s.cohesion);
      } else {
        steer(awayX, awayY, s.separation);
      }

      let arrived = false;
      if (this.target && s.follow !== 'none') {
        const tx = this.target.x - px;
        const ty = this.target.y - py;
        const distance = Math.hypot(tx, ty);
        const radius = Math.max(1, s.followRadius);
        if (s.follow === 'target') {
          // onto it: slower and slower inside the radius, with more force than the rules have
          arrived = distance < radius;
          steer(tx, ty, s.followWeight, s.maxSpeed * Math.min(1, distance / radius), s.maxForce * 2);
        } else {
          // around it: the pull fades inside the radius, so the flock circles instead of piling up
          steer(tx, ty, s.followWeight * Math.min(1, distance / radius));
        }
      }
      if (s.wander > 0) {
        // a turn of its own, across its heading
        const turn = (this.random() * 2 - 1) * s.wander * s.maxForce;
        fx += (-hy / speed) * turn;
        fy += (hx / speed) * turn;
      }
      if (!wrap) {
        const margin = Math.max(1, s.edgeMargin);
        if (px < margin) steer(1, 0, (margin - px) / margin + 0.5);
        else if (px > width - margin) steer(-1, 0, (px - (width - margin)) / margin + 0.5);
        if (py < margin) steer(0, 1, (margin - py) / margin + 0.5);
        else if (py > height - margin) steer(0, -1, (py - (height - margin)) / margin + 0.5);
      }
      ax[i] = fx;
      ay[i] = fy;
      this.arrived[i] = arrived ? 1 : 0;
    }

    // 3. the move
    const fastest = Math.max(1, s.maxSpeed);
    const slowest = Math.min(fastest, Math.max(0, s.minSpeed));
    for (let i = 0; i < n; i++) {
      let nvx = vx[i]! + ax[i]! * dt;
      let nvy = vy[i]! + ay[i]! * dt;
      const speed = Math.hypot(nvx, nvy);
      const least = this.arrived[i] === 1 ? 0 : slowest;
      if (speed > fastest) {
        nvx = (nvx / speed) * fastest;
        nvy = (nvy / speed) * fastest;
      } else if (speed < least && speed > 1e-6) {
        nvx = (nvx / speed) * least;
        nvy = (nvy / speed) * least;
      }
      vx[i] = nvx;
      vy[i] = nvy;
      let nx = x[i]! + nvx * dt;
      let ny = y[i]! + nvy * dt;
      if (wrap) {
        nx = ((nx % width) + width) % width;
        ny = ((ny % height) + height) % height;
      } else {
        // a boid that still reaches an edge (flying straight at it, it can only brake, and it never
        // flies slower than its slowest) bounces off it
        if (nx <= 0 || nx >= width) {
          vx[i] = nx <= 0 ? Math.abs(nvx) : -Math.abs(nvx);
          nx = Math.min(width, Math.max(0, nx));
        }
        if (ny <= 0 || ny >= height) {
          vy[i] = ny <= 0 ? Math.abs(nvy) : -Math.abs(nvy);
          ny = Math.min(height, Math.max(0, ny));
        }
      }
      x[i] = nx;
      y[i] = ny;
    }
  }
}

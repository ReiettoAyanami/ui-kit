// A flock: boids (Craig Reynolds, 1987). Every boid steers by three rules about the boids it sees
// around it (keep apart, head the same way, stay together), and here also towards a target, the
// pointer (lenzi, 2026-11-13: "The flocks need to be following the mouse (either approximately or like
// a precise target), need to behave like a normal flocking animation and every variable should be
// configurable"). Pure numbers, no drawing: the flock background draws it, the tests run it without
// a screen. Lengths in CSS px, speeds in px a second. A plain module (no schematic makes one).

import { seeded } from './color';

/**
 * How the flock takes the target (the pointer): not at all; around it, loosely; onto it, slowing to a stop;
 * or it is scared of it and flies away (lenzi, 2026-11-14: "make it so that the mouse is a scare away (not
 * obstacle) for the boids").
 */
export type BoidsFollow = 'none' | 'near' | 'target' | 'flee';

/** Something the boids are scared of: near it (inside `radius`, CSS px) they fly away from it, faster the nearer. */
export interface BoidsScare {
  x: number;
  y: number;
  radius: number;
}

export interface BoidsSettings {
  /** How many boids. */
  count: number;
  /**
   * Where the boids are born, px: around their leader, who is born on it (a scene's fleet starts where its leader
   * was put); none: anywhere in the space.
   */
  origin?: { x: number; y: number } | null;
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
  /**
   * "near": inside this distance from the target, px, the pull fades (they mill around it). "target": inside
   * it they slow down to stop on it. "flee": inside it they fly away from it.
   */
  followRadius: number;
  /** How much each boid turns by itself, at random: 0 none. */
  wander: number;
  /** At the edges: come back in from the other side, or turn away before them. */
  edges: 'wrap' | 'avoid';
  /** "avoid": how far from an edge, px, it starts turning. */
  edgeMargin: number;
  /**
   * How many flocks of their own (lenzi, 2026-11-14: "aumenta le colonie"): a boid heads the same way as,
   * and stays with, only the boids of its colony; it keeps apart from every boid. 1: one flock.
   */
  colonies?: number;
  /**
   * How much a boid follows its colony's leader (lenzi, 2026-11-14: "il 'leader' dovrebbe essere piú
   * grande"): the first boid of each colony is its leader; 0, it leads nobody.
   */
  leaderPull?: number;
  /**
   * How much the boids differ in size, 0 (all alike) to 1 (half to one and a half times) (lenzi, 2026-11-14:
   * "i boid dovrebbero essere tutti leggermente di dimensioni diverse"), and how many times larger a colony's
   * leader is.
   */
  sizeVariety?: number;
  leaderSize?: number;
  /**
   * How a boid's size changes how it flies (lenzi, 2026-11-14: "i boidi piú piccoli siano leggermente piú
   * lenti degli adulti, ma che abbiano un range di seguita un po' piú lungo ... che naturalmente i piú grandi
   * stanno in testa"): `sizeSpeed` how much slower a smaller one is (0: all as fast; 1: speed as size);
   * `sizeReach` how much farther a smaller one sees its flock (0: all alike; 1: a fifth smaller, a fifth farther).
   */
  sizeSpeed?: number;
  sizeReach?: number;
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
  colonies: 1,
  leaderPull: 0,
  sizeVariety: 0,
  leaderSize: 1,
  sizeSpeed: 0,
  sizeReach: 0,
};

/**
 * What the flock backgrounds give their boids: a little different each, the leaders nearly twice as large
 * and a little followed, the small ones a little slower and following from a little farther.
 */
export const DEFAULT_BOID_SIZES = { sizeVariety: 0.4, leaderSize: 1.9, leaderPull: 0.4, sizeSpeed: 0.35, sizeReach: 1 } as const;

/** The fastest a large boid (a leader) flies, times its flock's fastest: ahead, not away. */
const MOST_SPEED = 1.15;

/** The most boids a flock holds: beyond this a CPU flock is not smooth. */
export const MAX_BOIDS = 4000;

/**
 * A round obstacle, CSS px (lenzi, 2026-11-14: "a background that is the combination of flocks and blobs
 * the latter being a obstacle for the flocks").
 */
export interface BoidsObstacle {
  x: number;
  y: number;
  radius: number;
}

/**
 * What the boids fly around, as a field: how far a point is from the nearest obstacle's edge, CSS px,
 * below 0 inside one. Any shape: the blobs' own, melted where they meet. Near it they turn away and slide
 * along it; one that gets inside (the obstacle moved onto it) is pushed out past its edge.
 */
export type BoidsField = (x: number, y: number) => number;

/** Round obstacles as a field. */
export function roundField(obstacles: readonly BoidsObstacle[]): BoidsField | null {
  if (obstacles.length === 0) return null;
  return (x, y) => {
    let least = Infinity;
    for (const obstacle of obstacles) least = Math.min(least, Math.hypot(x - obstacle.x, y - obstacle.y) - obstacle.radius);
    return least;
  };
}

export class Boids {
  x = new Float32Array(0);
  y = new Float32Array(0);
  vx = new Float32Array(0);
  vy = new Float32Array(0);
  /** Each boid's own number, 0..1, drawn once: what makes it a little different (its size). */
  own = new Float32Array(0);
  /** Each boid's size, times the flock's: its own number spread by `sizeVariety`; a leader `leaderSize`. */
  scales = new Float32Array(0);
  private scaleKey = '';

  private settings: BoidsSettings;
  private width: number;
  private height: number;
  private target: { x: number; y: number } | null = null;
  private field: BoidsField | null = null;
  private scares: readonly BoidsScare[] = [];
  private scareWeight = 3;
  private avoid = 2;
  /** How far outside an obstacle's edge a boid stays: its own length, so none of it is drawn over the obstacle. */
  private pad = 0;
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

  /** How many leaders: one a colony (the first boid of each). */
  get leaders(): number {
    return Math.min(this.count, Math.max(1, Math.floor(this.settings.colonies ?? 1)));
  }

  /** Whether a boid leads its colony. */
  isLeader(index: number): boolean {
    return index < this.leaders;
  }

  /** New settings: the boids there stay where they are; more or fewer when the count changes. */
  configure(settings: Partial<BoidsSettings>): void {
    this.settings = { ...this.settings, ...settings };
    if (this.settings.count !== this.count) this.populate(this.settings.count);
    this.sizeUp();
  }

  /** The sizes again, when what makes them changed (the count, the variety, the leaders). */
  private sizeUp(): void {
    const s = this.settings;
    const key = `${this.count}|${s.sizeVariety ?? 0}|${s.leaderSize ?? 1}|${this.leaders}`;
    if (key === this.scaleKey) return;
    this.scaleKey = key;
    const variety = Math.min(1, Math.max(0, s.sizeVariety ?? 0)) * 0.5;
    const leader = Math.max(0.1, s.leaderSize ?? 1);
    this.scales = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) this.scales[i] = this.isLeader(i) ? leader : 1 + variety * (this.own[i]! * 2 - 1);
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

  /** What the boids are scared of now (they may move), and how much (0: not at all). */
  setScares(scares: readonly BoidsScare[], weight = 3): void {
    this.scares = scares;
    this.scareWeight = Math.max(0, weight);
  }

  /** Round obstacles the boids fly around now (they may move), and how hard they turn away (0: they fly through). */
  setObstacles(obstacles: readonly BoidsObstacle[], weight = 2, pad = 0): void {
    this.setField(roundField(obstacles), weight, pad);
  }

  /**
   * What the boids fly around now, as a field (any shape); how hard they turn away from it (0: they fly
   * through); how far outside its edge they stay, px.
   */
  setField(field: BoidsField | null, weight = 2, pad = 0): void {
    this.field = field;
    this.avoid = Math.max(0, weight);
    this.pad = Math.max(0, pad);
  }

  /** The boid nearest a point (CSS px of the space), or null when there is none. */
  nearest(x: number, y: number): { x: number; y: number } | null {
    let best = -1;
    let least = Infinity;
    for (let i = 0; i < this.count; i++) {
      const d = (this.x[i]! - x) ** 2 + (this.y[i]! - y) ** 2;
      if (d < least) {
        least = d;
        best = i;
      }
    }
    return best < 0 ? null : { x: this.x[best]!, y: this.y[best]! };
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
    this.own = grow(this.own);
    const speed = (this.settings.minSpeed + this.settings.maxSpeed) / 2;
    const origin = this.settings.origin;
    // born around their origin, in a round crowd as large as their number needs; the first (a leader) on it
    const crowd = Math.max(16, Math.sqrt(count) * 9);
    for (let i = kept; i < count; i++) {
      const heading = this.random() * Math.PI * 2;
      if (origin) {
        const away = i === 0 ? 0 : Math.sqrt(this.random()) * crowd;
        const towards = this.random() * Math.PI * 2;
        this.x[i] = origin.x + Math.cos(towards) * away;
        this.y[i] = origin.y + Math.sin(towards) * away;
      } else {
        // the numbers drawn as before origins: a flock without one is the same flock
        this.x[i] = this.random() * this.width;
        this.y[i] = this.random() * this.height;
      }
      this.vx[i] = Math.cos(heading) * speed;
      this.vy[i] = Math.sin(heading) * speed;
      this.own[i] = this.random();
    }
    this.cellOf = new Int32Array(count);
    this.sorted = new Int32Array(count);
    this.ax = new Float32Array(count);
    this.ay = new Float32Array(count);
    this.arrived = new Uint8Array(count);
    this.scaleKey = '';
    this.sizeUp();
  }

  /** One step of `dt` seconds: every boid looks around, steers, moves. */
  step(dt: number): void {
    const s = this.settings;
    const n = this.count;
    if (n === 0 || dt <= 0) return;
    const { x, y, vx, vy, ax, ay, width, height } = this;
    const wrap = s.edges === 'wrap';
    const scales = this.scales;
    // a boid's size sets how fast it flies and how far it sees its flock: the small ones a little slower,
    // following from a little farther, so the large ones (the leaders) end up ahead
    const sizeSpeed = Math.max(0, s.sizeSpeed ?? 0);
    const sizeReach = Math.max(0, s.sizeReach ?? 0);
    const speedOf = (i: number) => Math.min(MOST_SPEED, Math.max(0.5, 1 + sizeSpeed * (scales[i]! - 1)));
    const reachOf = (i: number) => 1 + sizeReach * Math.max(0, 1 - scales[i]!);
    let farthest = 1;
    for (let i = 0; i < n; i++) farthest = Math.max(farthest, reachOf(i));
    // the cells are as wide as the farthest sight
    const see = Math.max(1, s.perception) * farthest;
    const apart = Math.max(0, s.separationDistance);
    const cosHalfView = s.viewAngle >= 360 ? -2 : Math.cos((Math.max(0, s.viewAngle) * Math.PI) / 360);
    const colonies = Math.max(1, Math.floor(s.colonies ?? 1));
    const field = this.avoid > 0 ? this.field : null;
    /** Which way is out of the obstacles at a point: the field's slope, of length 1. */
    const outward = (fx: number, fy: number): [number, number] => {
      const gx = field!(fx + 1, fy) - field!(fx - 1, fy);
      const gy = field!(fx, fy + 1) - field!(fx, fy - 1);
      const length = Math.hypot(gx, gy);
      return length > 1e-6 ? [gx / length, gy / length] : [1, 0];
    };

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
      const own = Math.max(1, s.perception) * reachOf(i);
      const see2 = own * own;
      const top = Math.max(1, s.maxSpeed) * speedOf(i);
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
            // another colony: it only keeps apart from it
            if (colonies <= 1 || i % colonies === j % colonies) {
              seen++;
              headX += vx[j]!;
              headY += vy[j]!;
              centreX += dx;
              centreY += dy;
            }
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
      const steer = (towardX: number, towardY: number, weight: number, atSpeed = top, force = s.maxForce) => {
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
      // its colony's leader, if it has one and is not it: towards it, the nearest way round
      const leaderPull = s.leaderPull ?? 0;
      const leader = i % colonies;
      if (leaderPull > 0 && leader !== i && leader < n) {
        let lx = x[leader]! - px;
        let ly = y[leader]! - py;
        if (wrap) {
          if (lx > width / 2) lx -= width;
          else if (lx < -width / 2) lx += width;
          if (ly > height / 2) ly -= height;
          else if (ly < -height / 2) ly += height;
        }
        // close to it, it flies with the others instead of piling onto it
        const distance = Math.hypot(lx, ly);
        steer(lx, ly, leaderPull * Math.min(1, distance / (see * 2)));
      }

      let arrived = false;
      // what scares it: away, at full speed and with more force than the rules have, the harder the nearer
      const flee = (sx: number, sy: number, radius: number, weight: number) => {
        const ax = px - sx;
        const ay = py - sy;
        const distance = Math.hypot(ax, ay);
        if (distance >= radius || weight <= 0) return;
        const fear = 1 - distance / radius;
        steer(distance > 1e-6 ? ax : 1, distance > 1e-6 ? ay : 0, weight * fear * (1 + fear), top, s.maxForce * 2);
      };
      for (const scare of this.scares) flee(scare.x, scare.y, scare.radius, this.scareWeight);
      if (this.target && s.follow === 'flee') {
        flee(this.target.x, this.target.y, Math.max(1, s.followRadius), s.followWeight * 3);
      } else if (this.target && s.follow !== 'none') {
        const tx = this.target.x - px;
        const ty = this.target.y - py;
        const distance = Math.hypot(tx, ty);
        const radius = Math.max(1, s.followRadius);
        if (s.follow === 'target') {
          // onto it: slower and slower inside the radius, with more force than the rules have
          arrived = distance < radius;
          steer(tx, ty, s.followWeight, top * Math.min(1, distance / radius), s.maxForce * 2);
        } else {
          // around it: the pull fades inside the radius, so the flock circles instead of piling up
          steer(tx, ty, s.followWeight * Math.min(1, distance / radius));
        }
      }
      if (field) {
        // an obstacle near it: away from it, and along it the way it is already going, so it flows round
        const margin = Math.max(24, see * 0.8);
        const gap = field(px, py) - this.pad;
        if (gap < margin) {
          const near = Math.min(2, 1 - gap / margin);
          const [nx, ny] = outward(px, py);
          // along it: the side of the tangent its heading is on
          const side = -ny * hx + nx * hy >= 0 ? 1 : -1;
          // mostly along it, out more the closer it is: it flows round instead of turning back
          const out = 0.35 * near;
          steer(nx * out + -ny * side, ny * out + nx * side, this.avoid * near);
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

    // 3. the move: each as fast as its size lets it
    for (let i = 0; i < n; i++) {
      const fastest = Math.max(1, s.maxSpeed) * speedOf(i);
      const slowest = Math.min(fastest, Math.max(0, s.minSpeed) * speedOf(i));
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
      // over an obstacle (it moved onto the boid, or the boid was pushed): out past its edge, by its own
      // length, no longer flying into it (2026-11-14, "capisci come mai i boidi ogni tanto vanno sopra i
      // blob": they were let in up to 86% of a round obstacle, and a blob's shape reaches its full radius)
      if (field) {
        for (let tries = 0; tries < 3; tries++) {
          const gap = field(nx, ny) - this.pad;
          if (gap >= 0) break;
          const [ux, uy] = outward(nx, ny);
          nx -= ux * (gap - 0.5);
          ny -= uy * (gap - 0.5);
          const inward = vx[i]! * ux + vy[i]! * uy;
          if (inward < 0) {
            vx[i] = vx[i]! - inward * ux;
            vy[i] = vy[i]! - inward * uy;
          }
        }
      }
      x[i] = nx;
      y[i] = ny;
    }
  }
}

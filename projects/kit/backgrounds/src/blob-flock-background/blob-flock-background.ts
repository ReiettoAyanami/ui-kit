import { Component, DestroyRef, booleanAttribute, inject, input, numberAttribute } from '@angular/core';

import { BlobSettings, BlobState, DEFAULT_BLOBS, MAX_BLOBS, blobEdge, blobsAt } from '../engine/blob-field';
import { BlobMaterial, DROP, MaterialObject, MaterialScene } from '../engine/blob-materials';
import { BlobThrow } from '../engine/blob-throw';
import { Boids, BoidsField, BoidsFollow, BoidsSettings, DEFAULT_BOIDS, DEFAULT_BOID_SIZES, roundField } from '../engine/boids';
import { LinearRgb, linearToHex } from '../engine/color';
import { BOID_STRETCH, BoidShape, FlockScene } from '../engine/flock-scene';
import { GlowEngine } from '../engine/glow-engine';
import { BLOB_SHAPES, knownShapes } from '../engine/shapes';
import { LenziGlowBackground, LenziGlowScene } from '../glow-background/glow-background';
import { LenziSourceLamp } from '../glow/light-field';
import { LenziScares } from '../scare/scares';
import { LenziSights } from '../sights/sights';

/** What a blob is made of: a lamp (it glows), glass (it takes the light), solid (it stops it). */
export type LenziBlobMaterial = BlobMaterial;

/**
 * A fleet of boids that are blobs (lenzi, 2026-11-14: "un tipo di boid che puó essere un blob di qualsiasi
 * materiale"): they flock only with each other, melt only into the blobs and blob-boids of their own
 * material, and fly round everything of another material.
 */
export interface LenziBlobFlock {
  material: LenziBlobMaterial;
  /** How many. */
  count: number;
  /** Colonies of its own (each heading its own way, each with its leader); 1: one flock. */
  colonies?: number;
  /** A blob-boid's radius, px (each a little different, its leader larger). */
  size?: number;
}

/** The longest step of the flock, in seconds: a slow frame does not throw the boids around. */
const LONGEST_STEP = 1 / 30;
/** How long the flock has already flown at its first picture, in seconds: it is born a flock, not a scatter. */
const HEAD_START = 3;
/** How much light a blob is, and how bright as a light on the page (as the blob background's). */
const BLOB_LIGHT = 0.5;
const BLOB_LAMP = 0.28;
/** A blob-boid: its radius unless told, and how fast it flies against a boid (it is heavier). */
const BLOB_BOID_SIZE = 11;
const BLOB_BOID_SPEED = 0.7;
const BLOB_BOID_SHAPE = BLOB_SHAPES.circle;
/** How much brighter a lamp blob-boid is than a lamp blob (a blob is a deep shade, for the words over it). */
const LAMP_DROP_LIGHT = 2;

interface Fleet {
  spec: LenziBlobFlock;
  boids: Boids;
}

/** A blob-boid now: a drop, where it is, how large, of what, and the way it flies (radians). */
interface BlobBoid {
  x: number;
  y: number;
  radius: number;
  material: LenziBlobMaterial;
  heading: number;
}

/**
 * Blobs and flocks in one background (lenzi, 2026-11-14: "Make a background that is the combination of flocks
 * and blobs the latter being a obstacle for the flocks", then blobs "di vetro o solidi" and boids that are
 * blobs): the blob background's blobs, each a lamp, glass or solid (`materials`); a flock of boids that flies
 * round every blob; and fleets of boids that are blobs (`blobFlocks`), which melt into what is of their own
 * material and fly round the rest. The lamps light the page's lit surfaces; glass takes the light; solid stops
 * it. The boids are something to look at (LenziSights). What every glowing background does is
 * LenziGlowBackground's.
 */
@Component({
  selector: 'lenzi-blob-flock-background',
  imports: [],
  templateUrl: './blob-flock-background.html',
  styleUrls: ['../glow-background/glow-background.css', './blob-flock-background.css'],
})
export class LenziBlobFlockBackground extends LenziGlowBackground {
  // the blobs
  /** How many blobs, 16 at most. */
  readonly blobs = input(5, { transform: numberAttribute });
  /** A blob's radius, as a share of the smaller side of the space. */
  readonly blobSize = input(DEFAULT_BLOBS.size, { transform: numberAttribute });
  readonly sizeVariety = input(DEFAULT_BLOBS.sizeVariety, { transform: numberAttribute });
  /** Each blob's own size (a share of the smaller side), in order and round again; null: `blobSize` and `sizeVariety`. */
  readonly blobSizes = input<readonly number[] | null>(null);
  /** Each blob's material, in order and round again: a lamp, glass or solid. */
  readonly materials = input<readonly LenziBlobMaterial[]>(['lamp']);
  /** How far a blob wanders from its place, 0 to 1. */
  readonly travel = input(DEFAULT_BLOBS.travel, { transform: numberAttribute });
  /** How fast the shapes change into one another, and how fast they turn (turns a minute). */
  readonly morph = input(DEFAULT_BLOBS.morph, { transform: numberAttribute });
  readonly spin = input(DEFAULT_BLOBS.spin, { transform: numberAttribute });
  /** The shapes they take (BLOB_SHAPES' names). */
  readonly shapes = input<readonly string[]>(DEFAULT_BLOBS.shapes);
  /** How softly two blobs join, 0 to 1, and how soft their edge is, px. */
  readonly merge = input(0.35, { transform: numberAttribute });
  readonly soft = input(2, { transform: numberAttribute });

  // the flock
  /** How many boids, 4000 at most (2026-11-14: "aumenta leggermente i boidi"). */
  readonly boids = input(380, { transform: numberAttribute });
  /** How many flocks of their own: each heads its own way and keeps apart from the others ("aumenta le colonie"). */
  readonly colonies = input(4, { transform: numberAttribute });
  readonly maxSpeed = input(DEFAULT_BOIDS.maxSpeed, { transform: numberAttribute });
  readonly minSpeed = input(DEFAULT_BOIDS.minSpeed, { transform: numberAttribute });
  readonly maxForce = input(DEFAULT_BOIDS.maxForce, { transform: numberAttribute });
  readonly perception = input(DEFAULT_BOIDS.perception, { transform: numberAttribute });
  readonly separation = input(DEFAULT_BOIDS.separation, { transform: numberAttribute });
  readonly alignment = input(DEFAULT_BOIDS.alignment, { transform: numberAttribute });
  readonly cohesion = input(DEFAULT_BOIDS.cohesion, { transform: numberAttribute });
  /** How it takes the pointer: not at all; around it, loosely; onto it; or scared, away from it. */
  readonly follow = input<BoidsFollow>(DEFAULT_BOIDS.follow);
  readonly followWeight = input(DEFAULT_BOIDS.followWeight, { transform: numberAttribute });
  readonly followRadius = input(DEFAULT_BOIDS.followRadius, { transform: numberAttribute });
  readonly wander = input(DEFAULT_BOIDS.wander, { transform: numberAttribute });
  /** How hard the boids turn away from the blobs: 0 they fly through them. */
  readonly avoid = input(2, { transform: numberAttribute });
  /** How much the boids are scared of the page's `lenziScare` elements: 0 not at all. */
  readonly scare = input(3, { transform: numberAttribute });
  /** A boid's width, px (2026-11-14: "make them a bit bigger"), and its shape. */
  readonly boidSize = input(9, { transform: numberAttribute });
  readonly shape = input<BoidShape>('drop');
  /** How much the boids differ in size, 0 (all alike) to 1 (2026-11-14: "tutti leggermente di dimensioni diverse"). */
  readonly boidSizeVariety = input<number, unknown>(DEFAULT_BOID_SIZES.sizeVariety, { transform: numberAttribute });
  /** How many times larger each colony's leader is ("il 'leader' dovrebbe essere piú grande"), and how much its colony follows it. */
  readonly leaderSize = input<number, unknown>(DEFAULT_BOID_SIZES.leaderSize, { transform: numberAttribute });
  readonly leaderPull = input<number, unknown>(DEFAULT_BOID_SIZES.leaderPull, { transform: numberAttribute });
  /**
   * How a boid's size changes how it flies ("i boidi piú piccoli siano leggermente piú lenti ... ma che abbiano
   * un range di seguita un po' piú lungo"): how much slower the small ones are, how much farther they follow.
   */
  readonly sizeSpeed = input<number, unknown>(DEFAULT_BOID_SIZES.sizeSpeed, { transform: numberAttribute });
  readonly sizeReach = input<number, unknown>(DEFAULT_BOID_SIZES.sizeReach, { transform: numberAttribute });
  /** How long a boid's light stays behind it, 0 to 1 (the blobs leave a trail too). */
  readonly trails = input(0, { transform: numberAttribute });
  /** The pointer can take a blob and throw it; the boids fly round it wherever it goes. */
  readonly throwable = input(false, { transform: booleanAttribute });

  // the fleets of blob-boids
  /** Fleets of boids that are blobs, each of a material; none by default. */
  readonly blobFlocks = input<readonly LenziBlobFlock[]>([]);

  private elapsed = 0;
  private drawn: readonly BlobState[] = [];
  private readonly throws = new BlobThrow();
  private readonly scares = inject(LenziScares);
  private flock: Boids | null = null;
  private fleets: Fleet[] = [];
  private flockSeed = 1;

  constructor() {
    super();
    // its boids, of every flock, are something to look at (LenziSights)
    const leave = inject(LenziSights).add(this, (point) => {
      const origin = this.origin();
      let best: { x: number; y: number } | null = null;
      let least = Infinity;
      for (const flock of [this.flock, ...this.fleets.map((fleet) => fleet.boids)]) {
        const boid = flock?.nearest(point.x - origin.x, point.y - origin.y);
        if (!boid) continue;
        const distance = Math.hypot(boid.x + origin.x - point.x, boid.y + origin.y - point.y);
        if (distance < least) {
          least = distance;
          best = { x: boid.x + origin.x, y: boid.y + origin.y };
        }
      }
      return best;
    });
    inject(DestroyRef).onDestroy(leave);
  }

  protected override trail(): number {
    return Math.min(0.97, Math.max(0, this.trails()) * 0.97);
  }

  protected override resized(width: number, height: number): void {
    this.flock?.resize(width, height);
    for (const fleet of this.fleets) fleet.boids.resize(width, height);
  }

  /** The lamp blobs light the page's lit surfaces, as the blob background's do; glass and solid ones do not. */
  protected override lamps(): LenziSourceLamp[] {
    const tints = this.objectColours();
    const strength = Math.max(0, this.brightness()) * (0.5 + 0.5 * Math.max(0, this.glow()));
    return this.drawn
      .map((blob, index) => ({ blob, index }))
      .filter(({ index }) => this.materialOf(index) === 'lamp')
      .map(({ blob, index }) => ({
        left: blob.x - blob.radius,
        right: blob.x + blob.radius,
        top: blob.y - blob.radius,
        bottom: blob.y + blob.radius,
        color: linearToHex([tints[index * 3]!, tints[index * 3 + 1]!, tints[index * 3 + 2]!]),
        strength: strength * BLOB_LAMP,
        reach: blob.radius * 2.4,
      }));
  }

  protected override createScene(engine: GlowEngine): LenziGlowScene {
    const materials = new MaterialScene(engine);
    const flockScene = new FlockScene(engine);
    return {
      advance: (delta) => {
        this.elapsed += delta;
        this.throws.step(delta, this.paths(), this.width, this.height);
        const flock = this.current();
        const fleets = this.currentFleets();
        // the blobs where they are now, as drawn: what the flocks fly round (or melt into)
        this.drawn = this.blobsNow();
        this.obstacles(flock, fleets);
        const origin = this.origin();
        const scares = this.scares.circles().map((circle) => ({ x: circle.x - origin.x, y: circle.y - origin.y, radius: circle.radius }));
        const target = this.follow() === 'none' ? null : this.pointerInside();
        for (const boids of [flock, ...fleets.map((fleet) => fleet.boids)]) {
          boids.setTarget(target);
          boids.setScares(scares, this.scare());
          for (let left = Math.min(delta, LONGEST_STEP * 2); left > 1e-5; left -= LONGEST_STEP) boids.step(Math.min(left, LONGEST_STEP));
        }
      },
      prepare: () => {
        this.drawn = this.blobsNow();
        materials.set(this.objects(), { level: BLOB_LIGHT, soft: Math.max(0, this.soft()), ...this.surfaceLook });
        materials.prepare();
      },
      draw: () => {
        materials.drawLight();
        flockScene.draw(this.current(), this.objectColours(), Math.max(0.5, this.boidSize() / 2), this.shape(), 1);
      },
      shadow: () => materials.shadowTexture(),
      surfaces: (inputs) => materials.drawSurfaces(inputs),
      dispose: () => {
        flockScene.dispose();
        materials.dispose();
      },
    };
  }

  protected override grabbable(x: number, y: number): boolean {
    return this.throwable() && this.throws.blobAt(this.drawn, x, y) >= 0;
  }

  protected override grab(x: number, y: number, time: number): boolean {
    return this.throwable() && this.throws.grab(this.drawn, x, y, time);
  }

  protected override dragTo(x: number, y: number, time: number): void {
    this.throws.drag(x, y, time);
  }

  protected override letGo(time: number): void {
    this.throws.release(time);
  }

  /** A blob's material: the list, round again. */
  private materialOf(index: number): LenziBlobMaterial {
    const list = this.materials();
    return list.length ? list[index % list.length]! : 'lamp';
  }

  /**
   * One colour for each object (one array, so it is sent to the GPU once): the blobs take the first ones, the
   * blob-boids the ones after them, the boids from the first again.
   */
  private objectColours(): Float32Array {
    const fleets = this.blobFlocks().reduce((sum, fleet) => sum + Math.max(0, Math.floor(fleet.count)), 0);
    return this.colours(Math.min(4000 + MAX_BLOBS, Math.max(MAX_BLOBS + fleets, Math.floor(this.boids()))));
  }

  /** How softly the blobs join, px: as wide as they are large, the same on a phone and on a wide screen. */
  private mergePx(): number {
    return Math.max(0, this.merge()) * this.blobSize() * Math.min(this.width, this.height) * 0.5;
  }

  /** A blob-boid's radius: its fleet's size, times its own (a little different; its leader larger). */
  private radiusOf(fleet: Fleet, index: number): number {
    return Math.max(2, fleet.spec.size ?? BLOB_BOID_SIZE) * (fleet.boids.scales[index] ?? 1);
  }

  /** The blob-boids of the fleets: drops, each with its material and the way it flies (radians). */
  private blobBoids(fleets: readonly Fleet[]): BlobBoid[] {
    const out: BlobBoid[] = [];
    fleets.forEach((fleet) => {
      const { boids } = fleet;
      for (let i = 0; i < boids.count; i++) {
        out.push({ x: boids.x[i]!, y: boids.y[i]!, radius: this.radiusOf(fleet, i), material: fleet.spec.material, heading: Math.atan2(boids.vy[i]!, boids.vx[i]!) });
      }
    });
    return out;
  }

  /** A drop as the others fly round it: a circle for its head, a smaller one for its body. */
  private dropCircles(drops: readonly BlobBoid[]): { x: number; y: number; radius: number }[] {
    return drops.flatMap((drop) => {
      const ax = Math.cos(drop.heading);
      const ay = Math.sin(drop.heading);
      return [
        { x: drop.x + ax * DROP.head * drop.radius, y: drop.y + ay * DROP.head * drop.radius, radius: drop.radius },
        { x: drop.x - ax * drop.radius * 0.7, y: drop.y - ay * drop.radius * 0.7, radius: drop.radius * 0.65 },
      ];
    });
  }

  /**
   * What every flock flies round (lenzi, 2026-11-14: "I boidi normali ... per loro tutti i blob sono ostacoli";
   * the blob-boids "possono blobbarsi solo assieme ai blob e blob-boid dello stesso materiale" and the others
   * "sono ostacoli"): the boids, every blob and every blob-boid; a fleet, what is not of its material. Each
   * kept outside by its own length.
   */
  private obstacles(flock: Boids, fleets: readonly Fleet[]): void {
    const blobs = this.drawn;
    const circles = this.blobBoids(fleets);
    const merge = this.mergePx();
    // the boids: everything
    const largest = Math.max(this.leaderSize(), 1 + Math.min(1, Math.max(0, this.boidSizeVariety())) * 0.5);
    const pad = Math.max(0.5, this.boidSize() / 2) * largest * BOID_STRETCH[this.shape()] + Math.max(0, this.soft());
    flock.setField(union(blobs.length ? blobEdge(blobs, merge) : null, roundField(this.dropCircles(circles))), this.avoid(), pad);
    // a fleet: what is of another material
    fleets.forEach((fleet) => {
      const material = fleet.spec.material;
      const others = blobs.filter((_, index) => this.materialOf(index) !== material);
      const field = union(others.length ? blobEdge(others, merge) : null, roundField(this.dropCircles(circles.filter((circle) => circle.material !== material))));
      fleet.boids.setField(field, this.avoid(), (fleet.spec.size ?? BLOB_BOID_SIZE) * 1.2 + Math.max(0, this.soft()));
    });
  }

  /** Every object the material fields draw: the blobs, then the blob-boids, each in its material and colour. */
  private objects(): MaterialObject[] {
    const tints = this.objectColours();
    const tint = (index: number): LinearRgb => [tints[index * 3] ?? 1, tints[index * 3 + 1] ?? 1, tints[index * 3 + 2] ?? 1];
    const merge = this.mergePx();
    const objects: MaterialObject[] = this.drawn.map((blob, index) => ({
      x: blob.x,
      y: blob.y,
      radius: blob.radius,
      merge,
      rotation: blob.rotation,
      from: blob.from,
      to: blob.to,
      mix: blob.mix,
      material: this.materialOf(index),
      tint: tint(index),
    }));
    // the blob-boids: drops pointing where they fly (lenzi, 2026-11-14: "i blob boidi fai che siano gocce pure
    // loro"), joining from a little less far than the blobs, so a fleet stays many and not one puddle, though
    // two that touch melt
    let colour = MAX_BLOBS;
    // a lamp drop is small: it shines brighter than a lamp blob (2026-11-14: "manca la flotta di blob boid
    // luminosi": at a blob's deep shade, small drops did not read as lights)
    const bright = (rgb: LinearRgb, material: LenziBlobMaterial): LinearRgb =>
      material === 'lamp' ? [rgb[0] * LAMP_DROP_LIGHT, rgb[1] * LAMP_DROP_LIGHT, rgb[2] * LAMP_DROP_LIGHT] : rgb;
    for (const drop of this.blobBoids(this.currentFleets())) {
      objects.push({
        x: drop.x,
        y: drop.y,
        radius: drop.radius,
        merge: Math.min(merge, drop.radius * 0.6),
        rotation: drop.heading,
        from: BLOB_BOID_SHAPE,
        to: BLOB_BOID_SHAPE,
        mix: 0,
        material: drop.material,
        tint: bright(tint(colour++), drop.material),
        drop: true,
      });
    }
    return objects;
  }

  /** The blobs where they are now: their paths, and where they were thrown. */
  private blobsNow(): BlobState[] {
    return this.throws.apply(this.paths());
  }

  /** The blobs where their own paths put them now. */
  private paths(): BlobState[] {
    const sizes = this.blobSizes();
    const settings: BlobSettings = {
      count: this.blobs(),
      size: this.blobSize(),
      sizeVariety: this.sizeVariety(),
      travel: this.travel(),
      morph: this.morph(),
      spin: this.spin(),
      shapes: knownShapes(this.shapes()),
      pull: 0,
      seed: this.seed(),
      ...(sizes?.length ? { sizes } : {}),
    };
    return blobsAt(settings, this.elapsed, this.width, this.height, null);
  }

  /** What every flock shares: the inputs. */
  private flockSettings(): BoidsSettings {
    return {
      ...DEFAULT_BOIDS,
      count: this.boids(),
      maxSpeed: this.maxSpeed(),
      minSpeed: this.minSpeed(),
      maxForce: this.maxForce(),
      perception: this.perception(),
      separation: this.separation(),
      alignment: this.alignment(),
      cohesion: this.cohesion(),
      follow: this.follow(),
      followWeight: this.followWeight(),
      followRadius: this.followRadius(),
      wander: this.wander(),
      colonies: this.colonies(),
      leaderPull: this.leaderPull(),
      sizeVariety: this.boidSizeVariety(),
      leaderSize: this.leaderSize(),
      sizeSpeed: this.sizeSpeed(),
      sizeReach: this.sizeReach(),
    };
  }

  /** The flock with the settings of now; a new one for another seed. */
  private current(): Boids {
    const settings = this.flockSettings();
    if (!this.flock || this.flockSeed !== this.seed()) {
      this.flockSeed = this.seed();
      this.flock = new Boids(settings, this.width, this.height, this.flockSeed);
      this.fleets = [];
      this.drawn = this.blobsNow();
      this.obstacles(this.flock, this.currentFleets());
      for (let time = 0; time < HEAD_START; time += LONGEST_STEP) this.flock.step(LONGEST_STEP);
    } else {
      this.flock.configure(settings);
    }
    return this.flock;
  }

  /**
   * The fleets of blob-boids with the settings of now: one flock each, of their own (they never flock with the
   * boids, nor with another fleet), heavier, slower, kept apart by their size.
   */
  private currentFleets(): Fleet[] {
    const specs = this.blobFlocks();
    const shared = this.flockSettings();
    const next: Fleet[] = specs.map((spec, f) => {
      const size = Math.max(2, spec.size ?? BLOB_BOID_SIZE);
      const settings: BoidsSettings = {
        ...shared,
        count: Math.max(0, Math.floor(spec.count)),
        colonies: Math.max(1, Math.floor(spec.colonies ?? 1)),
        maxSpeed: shared.maxSpeed * BLOB_BOID_SPEED,
        minSpeed: shared.minSpeed * BLOB_BOID_SPEED,
        // kept apart by a drop's length and a little more: a fleet of drops, not a puddle
        separationDistance: Math.max(shared.separationDistance, size * 4.8),
        separation: Math.max(shared.separation, 2.2),
        perception: Math.max(shared.perception, size * 8),
      };
      const old = this.fleets[f];
      if (old && old.spec.material === spec.material) {
        old.boids.configure(settings);
        return { spec, boids: old.boids };
      }
      const boids = new Boids(settings, this.width, this.height, this.seed() * 31 + f + 1);
      for (let time = 0; time < HEAD_START; time += LONGEST_STEP) boids.step(LONGEST_STEP);
      return { spec, boids };
    });
    this.fleets = next;
    return next;
  }
}

/** Two fields as one: the nearer edge of the two. */
function union(a: BoidsField | null, b: BoidsField | null): BoidsField | null {
  if (!a) return b;
  if (!b) return a;
  return (x, y) => Math.min(a(x, y), b(x, y));
}

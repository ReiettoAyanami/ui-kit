import { Component, DOCUMENT, DestroyRef, booleanAttribute, inject, input, numberAttribute } from '@angular/core';

import { BlobSettings, BlobState, DEFAULT_BLOBS, LenziBlobSpec, MAX_BLOBS, blobEdge, blobsAt, blobsBump, paletteOf, specSettings } from '../engine/blob-field';
import { BlobMaterial, DROP, MaterialObject, MaterialScene } from '../engine/blob-materials';
import { BlobThrow } from '../engine/blob-throw';
import { BlobDrift, LenziCurrent, blobCarried, blobSink, currentsFlow } from '../engine/currents';
import { Boids, BoidsArea, BoidsField, BoidsFollow, BoidsSettings, DEFAULT_BOIDS, DEFAULT_BOID_SIZES, roundField } from '../engine/boids';
import { LinearRgb, PALETTE_STEP, displacedColors, hexToLinear, linearToHex, paletteAt } from '../engine/color';
import { BOID_STRETCH, BoidShape, FlockScene } from '../engine/flock-scene';
import { GlowEngine } from '../engine/glow-engine';
import { BLOB_SHAPES, knownShapes } from '../engine/shapes';
import { LenziGlowBackground, LenziGlowScene } from '../glow-background/glow-background';
import { LenziSourceLamp } from '../glow/light-field';
import { LenziGathers } from '../gather/gathers';
import { LenziScares } from '../scare/scares';
import { LenziSights } from '../sights/sights';

/** What a blob is made of: a lamp (it glows), glass (it takes the light), solid (it stops it). */
export type LenziBlobMaterial = BlobMaterial;

/**
 * A fleet of boids that are blobs (lenzi, 2026-11-14: "un tipo di boid che puó essere un blob di qualsiasi
 * materiale"): they flock only with each other, melt only into the blobs and blob-boids of their own
 * material, and fly round everything of another material.
 */
export interface LenziBlobFlock extends LenziFleetWays {
  material: LenziBlobMaterial;
  /** How many. */
  count: number;
  /** Colonies of its own (each heading its own way, each with its leader); 1: one flock. */
  colonies?: number;
  /** A blob-boid's radius, px (each a little different, its leader larger). */
  size?: number;
  /** Its layer (z-level): it stops, and is stopped by, only what is on the same one. Unless told, its material's. */
  layer?: number;
  /** Where its leader is put, as a share of the space (0 to 1 each way): the fleet is born around it. */
  x?: number;
  y?: number;
  /** Its colour (a `#rrggbb`; a lamp fleet's moved a little drop by drop); none: the accent's. */
  colour?: string;
  /** Two or more colours it shifts among, each drop at its own place along the loop; given, `colour` is left aside. */
  colours?: string[];
  /** Glass: how much its colour colours what is seen through it, 0 to 1. */
  tint?: number;
  /** Glass: how much of what is behind it shows through, 0 to 1. */
  transparency?: number;
  /** Glass that shines too, in its colour (a solid fleet that shines is of lamps). */
  emitting?: boolean;
}

/**
 * How a fleet flies: its leader's ways, which every one of it takes (lenzi, 2026-11-14: "si decide un capo e ogni
 * capo avrá una flotta di n boidi. questa flotta avrá tutte le proprietá del leader, tranne la grandezza che va
 * configurata a parte e anche il displacement della stessa"). What a fleet does not say, the background's inputs
 * say (for blob-boids, a little slower and closer than boids).
 */
export interface LenziFleetWays {
  /** Fastest and slowest, px/s. */
  maxSpeed?: number;
  minSpeed?: number;
  /** The three rules' weights: keep apart, head the same way, stay together. */
  separation?: number;
  alignment?: number;
  cohesion?: number;
  /** Turns of its own. */
  wander?: number;
  /** How different their sizes are, 0 to 1 (its "displacement"). */
  sizeVariety?: number;
  /**
   * What it does with the pointer, a fleet apart from the others (lenzi, 2026-11-17: "This should be configurable
   * for every boid"): flees it, flies around it, onto it, or takes no notice. Not said: the `follow` input's.
   */
  follow?: BoidsFollow;
}

/** A fleet of boids, its leader's ways and its own count, colonies and size. */
export interface LenziBoidFlock extends LenziFleetWays {
  count: number;
  /** Colonies of its own (each with its leader); 1: one flock. */
  colonies?: number;
  /** A boid's width, px (the `boidSize` input when not said). */
  size?: number;
  /** Its layer (z-level): the blobs and blob-boids on it are what it flies round (the `boidLayer` input when not said). */
  layer?: number;
  /** Where its leader is put, as a share of the space (0 to 1 each way): the fleet is born around it. */
  x?: number;
  y?: number;
  /** Its colour (a `#rrggbb`, moved a little boid by boid); none: the accent's. */
  colour?: string;
  /** Two or more colours it shifts among, each boid at its own place along the loop; given, `colour` is left aside. */
  colours?: string[];
}

/** A fleet's leader's place in a space, px; null: the fleet has none (born anywhere). */
function originOf(fleet: { x?: number; y?: number }, width: number, height: number): { x: number; y: number } | null {
  return typeof fleet.x === 'number' && typeof fleet.y === 'number' ? { x: fleet.x * width, y: fleet.y * height } : null;
}

/** What a flock may do with the pointer. */
const FOLLOWS: readonly BoidsFollow[] = ['none', 'near', 'target', 'flee'];

/** The ways a fleet says, and only those (the rest stays the background's). */
function waysOf(fleet: LenziFleetWays): Partial<BoidsSettings> {
  const ways: Partial<BoidsSettings> = {};
  for (const key of ['maxSpeed', 'minSpeed', 'separation', 'alignment', 'cohesion', 'wander', 'sizeVariety'] as const) {
    const value = fleet[key];
    if (typeof value === 'number' && Number.isFinite(value)) ways[key] = value;
  }
  if (fleet.follow && FOLLOWS.includes(fleet.follow)) ways.follow = fleet.follow;
  return ways;
}

/**
 * Each material's layer (z-level), unless a blob or a fleet has its own (lenzi, 2026-11-14: "the z-index of
 * the blobs decides which is an obstacle to what ... the glass boidsblobs and blobs on top of them so that
 * they can go under"): the lamps, the solid things and the boids on one; glass above them, so they fly under it.
 */
export const MATERIAL_LAYERS: Readonly<Record<LenziBlobMaterial, number>> = { lamp: 0, glass: 1, solid: 0 };

/** Something on a layer: a blob or a blob-boid (its material), or a boid (no material). */
export interface LenziLayered {
  material: LenziBlobMaterial | null;
  layer: number;
}

/**
 * Whether `thing` is an obstacle to `mover`: only on the same layer; there, a blob or a blob-boid stops the
 * boids, and what is of another material than the mover (the same material melts into it).
 */
export function stops(thing: LenziLayered, mover: LenziLayered): boolean {
  return thing.layer === mover.layer && thing.material !== mover.material;
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
/** No colours: a fleet of its own colour does not take the accent's. */
const NO_COLOURS = new Float32Array(0);

interface Fleet {
  spec: LenziBlobFlock;
  boids: Boids;
}

/** A fleet of boids and its flock. */
interface BoidFleet {
  spec: LenziBoidFlock;
  boids: Boids;
}

/** A blob-boid now: a drop, where it is, how large, of what, and the way it flies (radians). */
interface BlobBoid {
  x: number;
  y: number;
  radius: number;
  material: LenziBlobMaterial;
  heading: number;
  /** How far it still is from its place in a zone (`Boids.away`): 0 there, 1 on its way. */
  away: number;
  /** Its fleet's layer. */
  layer: number;
  /** Its fleet's own colour (a lamp's moved a little drop by drop), and how much of it glass takes. */
  colour?: LinearRgb;
  tintAmount?: number;
  clarity?: number;
  /** Glass that shines. */
  emit?: boolean;
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

/** On its way to its place (`Boids.away` 1), how much less a drop melts into the others. */
const DROP_APART = 0.85;
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
  /**
   * The blobs one by one (a scene's): each its material, size and, when said, its place, shape, level, colour, tint,
   * whether it stays put and its weight (`LenziBlobSpec`). Given, it is the blobs: `blobs`, `materials`,
   * `blobSizes` and `blobLayers` are left aside.
   */
  readonly blobSpecs = input<readonly LenziBlobSpec[] | null>(null);
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
  /**
   * Currents (lenzi, 2026-11-14: "una corrente (definita da una serie di segmenti, con ognuno le sue forze
   * indipendenti) che instrada i boidi e i blob"): near a segment, the boids and the blobs are pushed along it.
   */
  readonly currents = input<readonly LenziCurrent[] | null>(null);
  /** How hard the boids keep to the zone of the page they gather under (`lenziGather`); 0: they do not. */
  readonly gather = input(2, { transform: numberAttribute });
  /**
   * How far the boids go with the page's scroll (lenzi, 2026-11-19: "lo scroll della pagina non deve influire sulla
   * posizione dei boidi ... se scrollo i boidi devono rimanere ... e seguirmi"): 1, as far as the words, at once, as if
   * they were on the page; 0, not at all (behind it, fixed). The boids and the blob-boids, not the blobs.
   */
  readonly scroll = input(0, { transform: numberAttribute });
  /**
   * The boids as fleets, each its own flock with its leader's ways and its own count, colonies and size (a
   * scene's fleets); null: one flock of `boids` in `colonies`, as the inputs say.
   */
  readonly boidFlocks = input<readonly LenziBoidFlock[] | null>(null);

  // the layers (z-levels): something stops only what is on its own layer
  /** Each material's layer; the ones not given are MATERIAL_LAYERS' (lamp 0, glass 1, solid 0). */
  readonly materialLayers = input<Partial<Record<LenziBlobMaterial, number>>>(MATERIAL_LAYERS);
  /** Each blob's own layer, in order and round again; null: its material's. */
  readonly blobLayers = input<readonly number[] | null>(null);
  /** The boids' layer: the blobs and blob-boids on it are what they fly round. */
  readonly boidLayer = input(0, { transform: numberAttribute });

  private elapsed = 0;
  private readonly view = inject(DOCUMENT).defaultView;
  /** The page's scroll at the last frame; null: not read yet. */
  private scrolledTo: { x: number; y: number } | null = null;
  private drawn: readonly BlobState[] = [];
  private readonly throws = new BlobThrow();
  private readonly scares = inject(LenziScares);
  private readonly gathers = inject(LenziGathers);
  private flocks: BoidFleet[] = [];
  private fleets: Fleet[] = [];
  private flockSeed = Number.NaN;
  /** The blobs' drifts in the currents, and the currents' push (kept while they are the same). */
  private readonly drift = new BlobDrift();
  private flowKey = '';
  private flowAt: ((x: number, y: number) => readonly [number, number]) | null = null;
  /** The colours of the boid fleets that have one of their own, by colour, count, spread and seed. */
  private readonly fleetTints = new Map<string, Float32Array>();
  /** The colours shifted among, read once. */
  private readonly palettes = new Map<string, LinearRgb[]>();

  constructor() {
    super();
    // its boids, of every flock, are something to look at (LenziSights)
    const leave = inject(LenziSights).add(this, (point) => {
      const origin = this.origin();
      let best: { x: number; y: number } | null = null;
      let least = Infinity;
      for (const flock of [...this.flocks.map((fleet) => fleet.boids), ...this.fleets.map((fleet) => fleet.boids)]) {
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
    for (const fleet of [...this.flocks, ...this.fleets]) fleet.boids.resize(width, height);
  }

  /** The lamp blobs light the page's lit surfaces, as the blob background's do; glass and solid ones do not. */
  protected override lamps(): LenziSourceLamp[] {
    const tints = this.objectColours();
    const strength = Math.max(0, this.brightness()) * (0.5 + 0.5 * Math.max(0, this.glow()));
    // the lamps, and the glass that shines
    return this.drawn
      .map((blob, index) => ({ blob, index }))
      .filter(({ index }) => this.materialOf(index) === 'lamp' || (this.materialOf(index) === 'glass' && this.blobSpecs()?.[index]?.emitting === true))
      .map(({ blob, index }) => ({
        left: blob.x - blob.radius,
        right: blob.x + blob.radius,
        top: blob.y - blob.radius,
        bottom: blob.y + blob.radius,
        color: linearToHex(this.blobTint(index, tints)),
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
        // the currents: they carry the blobs (a blob that stays put not at all, a heavy one much less) and the boids;
        // heavy blobs sink, light ones rise
        const flow = this.flow();
        if (flow || this.sinks()) this.drift.step(delta, this.placed(), flow, (i) => this.carried(i), (i) => this.sink(i), this.height);
        // a blob in the hand is where the hand is: no current carries it
        this.drift.still(this.throws.held);
        this.bump();
        const flocks = this.current();
        const fleets = this.currentFleets();
        // the blobs where they are now, as drawn: what the flocks fly round (or melt into)
        this.drawn = this.blobsNow();
        this.obstacles(flocks, fleets);
        const origin = this.origin();
        const scares = this.scares.circles().map((circle) => ({ x: circle.x - origin.x, y: circle.y - origin.y, radius: circle.radius }));
        // every flock is told where the pointer is; what it does with it is its own (`follow`, a fleet apart)
        const pointer = this.pointerInside();
        const home = this.homeNow(origin);
        const [shiftX, shiftY] = this.scrolled();
        for (const boids of [...flocks.map((fleet) => fleet.boids), ...fleets.map((fleet) => fleet.boids)]) {
          boids.setTarget(pointer);
          boids.setScares(scares, this.scare());
          boids.setFlow(flow);
          boids.shift(shiftX, shiftY);
          boids.setHome(home, this.gather());
          for (let left = Math.min(delta, LONGEST_STEP * 2); left > 1e-5; left -= LONGEST_STEP) boids.step(Math.min(left, LONGEST_STEP));
        }
      },
      prepare: () => {
        this.drawn = this.blobsNow();
        materials.set(this.objects(), { level: BLOB_LIGHT, soft: Math.max(0, this.soft()), ...this.surfaceLook });
        materials.prepare();
      },
      draw: () => {
        const colours = this.objectColours();
        // each fleet of boids on its level: over the lamps of that level and of the ones under it, under the lamps
        // of the ones above (lenzi, 2026-11-15: "under solid blobs you can see the boids still")
        materials.drawLight(
          this.current().map((fleet) => ({
            layer: fleet.spec.layer ?? this.boidLayer(),
            draw: () => flockScene.draw(fleet.boids, this.fleetColours(fleet.spec, colours), Math.max(0.5, this.sizeOf(fleet.spec) / 2), this.shape(), 1),
          })),
        );
      },
      shadow: () => materials.shadowTexture(),
      // a solid blob stops all the light behind it (2026-11-15: "solid objects can still let light through")
      shadowAmount: 1,
      solids: (inputs) => materials.drawSolids(inputs),
      surfaces: (inputs) => materials.drawSurfaces(inputs),
      dispose: () => {
        flockScene.dispose();
        materials.dispose();
      },
    };
  }

  /** The blobs as drawn in the last picture (where, how large, turned, of what shapes), in the space's px. */
  blobsDrawn(): readonly BlobState[] {
    return this.drawn;
  }

  protected override grabbable(x: number, y: number): boolean {
    const index = this.throwable() ? this.throws.blobAt(this.drawn, x, y) : -1;
    // a blob made fast is never taken ("an option to make a blob unmovable")
    return index >= 0 && this.blobSpecs()?.[index]?.fixed !== true;
  }

  protected override grab(x: number, y: number, time: number): boolean {
    return this.grabbable(x, y) && this.throws.grab(this.drawn, x, y, time);
  }

  protected override dragTo(x: number, y: number, time: number): void {
    this.throws.drag(x, y, time);
  }

  protected override letGo(time: number): void {
    this.throws.release(time);
  }

  /** A blob's material: the list, round again. */
  private materialOf(index: number): LenziBlobMaterial {
    const spec = this.blobSpecs()?.[index];
    if (spec) return spec.material;
    const list = this.materials();
    return list.length ? list[index % list.length]! : 'lamp';
  }

  /** A blob's colour: the one it is shifting through now, its own (a `#rrggbb`), or the accent moved a little. */
  private blobTint(index: number, tints: Float32Array): LinearRgb {
    const spec = this.blobSpecs()?.[index];
    const palette = paletteOf(spec?.colours);
    if (palette) return this.shifting(palette, index * 0.37);
    const own = spec?.colour;
    if (own && /^#[0-9a-f]{6}$/i.test(own)) return hexToLinear(own);
    return [tints[index * 3] ?? 1, tints[index * 3 + 1] ?? 1, tints[index * 3 + 2] ?? 1];
  }

  /** Where a colour shifting among a few is now (each object at its own place along the loop). */
  private shifting(palette: readonly string[], phase: number): LinearRgb {
    const key = palette.join(',');
    let linear = this.palettes.get(key);
    if (!linear) {
      linear = palette.map(hexToLinear);
      this.palettes.set(key, linear);
    }
    return paletteAt(linear, this.elapsed / (PALETTE_STEP * linear.length) + phase);
  }

  /** Each boid fleet's colours: shifting among its own, its own colour moved a little boid by boid, or the accent's. */
  private fleetColours(spec: LenziBoidFlock, shared: Float32Array): Float32Array {
    const palette = paletteOf(spec.colours);
    if (palette) {
      // every boid at its own place along the loop: a new list each frame (the colours move)
      const count = Math.max(1, Math.floor(spec.count));
      const colours = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) colours.set(this.shifting(palette, i * 0.618), i * 3);
      return colours;
    }
    if (!spec.colour || !/^#[0-9a-f]{6}$/i.test(spec.colour)) return shared;
    const count = Math.max(1, Math.floor(spec.count));
    const key = `${spec.colour}|${count}|${this.spread()}|${this.seed()}`;
    let colours = this.fleetTints.get(key);
    if (!colours) {
      colours = displacedColors(hexToLinear(spec.colour), count, Math.min(1, Math.max(0, this.spread())), this.seed());
      this.fleetTints.set(key, colours);
      // only the ones in use are kept
      if (this.fleetTints.size > 16) this.fleetTints.delete(this.fleetTints.keys().next().value!);
    }
    return colours;
  }

  /**
   * One colour for each object (one array, so it is sent to the GPU once): the blobs take the first ones, the
   * blob-boids the ones after them, the boids from the first again.
   */
  private objectColours(): Float32Array {
    const fleets = this.blobFlocks().reduce((sum, fleet) => sum + Math.max(0, Math.floor(fleet.count)), 0);
    const largestFlock = Math.max(0, ...this.boidSpecs().map((spec) => Math.floor(spec.count)));
    return this.colours(Math.min(4000 + MAX_BLOBS, Math.max(MAX_BLOBS + fleets, largestFlock)));
  }

  /** The boids' fleets: the scene's, or one flock as the inputs say. */
  private boidSpecs(): readonly LenziBoidFlock[] {
    return this.boidFlocks() ?? [{ count: this.boids(), colonies: this.colonies() }];
  }

  /** A boid's width in a fleet, px. */
  private sizeOf(spec: LenziBoidFlock): number {
    return spec.size ?? this.boidSize();
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
      const { boids, spec } = fleet;
      const layer = this.fleetLayerOf(spec);
      // its own colour: a lamp fleet's moved a little drop by drop (as the accent is), glass and solid as it is
      const palette = paletteOf(spec.colours);
      const own = !palette && spec.colour && /^#[0-9a-f]{6}$/i.test(spec.colour) ? hexToLinear(spec.colour) : null;
      const emit = spec.material === 'glass' && spec.emitting === true;
      const colours = own && (spec.material === 'lamp' || emit) ? this.fleetColours({ count: boids.count, colour: spec.colour }, NO_COLOURS) : null;
      for (let i = 0; i < boids.count; i++) {
        const colour: LinearRgb | undefined = palette
          ? this.shifting(palette, i * 0.618)
          : colours
            ? [colours[i * 3]!, colours[i * 3 + 1]!, colours[i * 3 + 2]!]
            : (own ?? undefined);
        out.push({
          x: boids.x[i]!,
          y: boids.y[i]!,
          radius: this.radiusOf(fleet, i),
          material: spec.material,
          heading: Math.atan2(boids.vy[i]!, boids.vx[i]!),
          away: boids.away[i] ?? 0,
          layer,
          ...(colour ? { colour } : {}),
          ...(typeof spec.tint === 'number' ? { tintAmount: spec.tint } : {}),
          ...(typeof spec.transparency === 'number' ? { clarity: spec.transparency } : {}),
          ...(emit ? { emit } : {}),
        });
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
  private obstacles(flocks: readonly BoidFleet[], fleets: readonly Fleet[]): void {
    const blobs = this.drawn.map((blob, index) => ({ blob, material: this.materialOf(index), layer: this.blobLayerOf(index) }));
    const drops = this.blobBoids(fleets);
    const merge = this.mergePx();
    /** What stops a mover (on its layer, of another material), as one field. */
    const fieldFor = (mover: LenziLayered): BoidsField | null => {
      const stopping = blobs.filter((thing) => stops(thing, mover)).map((thing) => thing.blob);
      const stoppingDrops = drops.filter((drop) => stops(drop, mover));
      return union(stopping.length ? blobEdge(stopping, merge) : null, roundField(this.dropCircles(stoppingDrops)));
    };
    // the boids: every blob and blob-boid on their layer (a fleet's own, or the boids'), each fleet kept out by its
    // own largest boid's length
    const boidFields = new Map<number, BoidsField | null>();
    for (const fleet of flocks) {
      const layer = fleet.spec.layer ?? this.boidLayer();
      if (!boidFields.has(layer)) boidFields.set(layer, fieldFor({ material: null, layer }));
      const boidField = boidFields.get(layer)!;
      const variety = fleet.spec.sizeVariety ?? this.boidSizeVariety();
      const largest = Math.max(this.leaderSize(), 1 + Math.min(1, Math.max(0, variety)) * 0.5);
      const pad = Math.max(0.5, this.sizeOf(fleet.spec) / 2) * largest * BOID_STRETCH[this.shape()] + Math.max(0, this.soft());
      fleet.boids.setField(boidField, this.avoid(), pad);
    }
    // a fleet: what is on its layer and of another material
    fleets.forEach((fleet) => {
      const field = fieldFor({ material: fleet.spec.material, layer: this.fleetLayerOf(fleet.spec) });
      fleet.boids.setField(field, this.avoid(), (fleet.spec.size ?? BLOB_BOID_SIZE) * 1.2 + Math.max(0, this.soft()));
    });
  }

  /** A blob's layer: its own (`blobLayers`), else its material's. */
  private blobLayerOf(index: number): number {
    const spec = this.blobSpecs()?.[index];
    if (spec) return spec.layer ?? this.materialLayer(spec.material);
    const own = this.blobLayers();
    return own?.length ? own[index % own.length]! : this.materialLayer(this.materialOf(index));
  }

  /** A fleet's layer: its own, else its material's. */
  private fleetLayerOf(spec: LenziBlobFlock): number {
    return spec.layer ?? this.materialLayer(spec.material);
  }

  private materialLayer(material: LenziBlobMaterial): number {
    return this.materialLayers()[material] ?? MATERIAL_LAYERS[material];
  }

  /** Every object the material fields draw: the blobs, then the blob-boids, each in its material and colour. */
  private objects(): MaterialObject[] {
    const tints = this.objectColours();
    const tint = (index: number): LinearRgb => [tints[index * 3] ?? 1, tints[index * 3 + 1] ?? 1, tints[index * 3 + 2] ?? 1];
    const merge = this.mergePx();
    const specs = this.blobSpecs();
    const objects: MaterialObject[] = this.drawn.map((blob, index) => {
      const own = this.blobTint(index, tints);
      const spec = specs?.[index];
      return {
        x: blob.x,
        y: blob.y,
        radius: blob.radius,
        merge,
        rotation: blob.rotation,
        from: blob.from,
        to: blob.to,
        mix: blob.mix,
        material: this.materialOf(index),
        tint: own,
        layer: this.blobLayerOf(index),
        // glass and solid: their own colour only when said (else the page's glass, or their tint)
        ...(spec?.colour || paletteOf(spec?.colours) ? { colour: own } : {}),
        ...(typeof spec?.tint === 'number' ? { tintAmount: spec.tint } : {}),
        ...(typeof spec?.transparency === 'number' ? { clarity: spec.transparency } : {}),
        ...(spec?.emitting ? { emit: true } : {}),
      };
    });
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
        // on their way to a zone they melt hardly at all, so they are seen as many; near their places they melt into one
        // (lenzi, 2026-11-19: "si veda proprio il fatto che siano tanti quindi magari dovrebbero unirsi solo quando sono
        // più vicini")
        merge: Math.min(merge, drop.radius * 0.6) * (1 - DROP_APART * drop.away),
        rotation: drop.heading,
        from: BLOB_BOID_SHAPE,
        to: BLOB_BOID_SHAPE,
        mix: 0,
        material: drop.material,
        tint: bright(drop.colour ?? tint(colour), drop.material),
        drop: true,
        layer: drop.layer,
        ...(drop.colour ? { colour: drop.colour } : {}),
        ...(typeof drop.tintAmount === 'number' ? { tintAmount: drop.tintAmount } : {}),
        ...(typeof drop.clarity === 'number' ? { clarity: drop.clarity } : {}),
        ...(drop.emit ? { emit: true } : {}),
      });
      colour++;
    }
    return objects;
  }

  /**
   * The blobs where they are now: their paths, where they were thrown, where the currents carried them. With no
   * current each is back on its own path: read here, not only as time goes on, because a still picture (a scene being
   * made, paused) has no time, and its blobs stayed where the current had left them (lenzi, 2026-11-15: "Some object
   * selection goes wrong right after toggling pause/play": a blob drawn away from where the maker has it).
   */
  private blobsNow(): BlobState[] {
    // nothing drifts in a still picture, nor with no current and no blob that sinks
    if (!this.animate() || (!this.flow() && !this.sinks())) this.drift.reset();
    return this.drift.apply(this.placed(), this.width, this.height);
  }

  /** The blobs where their paths and throws put them, before the currents carry them. */
  private placed(): BlobState[] {
    if ((this.throwable() || this.bumping()) && this.animate()) return this.throws.apply(this.paths());
    // nothing thrown or pushed when nothing may be, or in a still picture (a scene being made): every blob where its
    // path puts it, and it plays on from there
    this.throws.reset();
    return this.paths();
  }

  /** Whether some blob stops the blobs of its level (`obstacle`): then blobs may be pushed off their paths. */
  private bumping(): boolean {
    return this.blobSpecs()?.some((spec) => spec.obstacle === true) === true;
  }

  /**
   * Blobs that stop one another bounce apart (lenzi, 2026-11-15: "a toggle that decides if a blob is an obstacle for
   * the same z-level or not, so some blobs will be able to collide too"): on one level, of two materials, one of them
   * an obstacle. A blob made fast is not pushed; a heavier or larger one less.
   */
  private bump(): void {
    const specs = this.blobSpecs();
    if (!specs || !this.bumping()) return;
    this.throws.collide(
      this.blobsNow(),
      (one, other) => blobsBump(specs[one], specs[other], this.blobLayerOf(one), this.blobLayerOf(other)),
      (index) => (specs[index]?.fixed ? 0 : Math.max(0.25, specs[index]?.weight ?? 1) * Math.max(0.0001, specs[index]?.size ?? 0.1) ** 2),
    );
  }

  /** How much a current carries a blob: a blob that stays put not at all, a heavier one much less (blobCarried). */
  private carried(index: number): number {
    const spec = this.blobSpecs()?.[index];
    return blobCarried(spec?.weight, spec?.fixed);
  }

  /** How hard a blob sinks (a heavier one more; lighter than 1, it rises), px/s² (blobSink). */
  private sink(index: number): number {
    const spec = this.blobSpecs()?.[index];
    return blobSink(spec?.weight, spec?.fixed);
  }

  /** How far the boids go with what the page scrolled since the last frame, px (the words go up as it scrolls down). */
  private scrolled(): readonly [number, number] {
    const view = this.view;
    if (!view) return [0, 0];
    const now = { x: view.scrollX, y: view.scrollY };
    const was = this.scrolledTo;
    this.scrolledTo = now;
    const share = this.scroll();
    if (!was || share === 0) return [0, 0];
    return [-(now.x - was.x) * share, -(now.y - was.y) * share];
  }

  /** The lines of the zone of the page the boids gather under now (`lenziGather`), in the space's px; none. */
  private homeNow(origin: { x: number; y: number }): BoidsArea[] {
    return this.gathers
      .areas(this.view?.innerWidth ?? this.width, this.view?.innerHeight ?? this.height)
      .map((area) => ({ left: area.left - origin.x, top: area.top - origin.y, right: area.right - origin.x, bottom: area.bottom - origin.y }));
  }

  /** Whether some blob sinks or rises (its weight is not 1): then the blobs drift with no current too. */
  private sinks(): boolean {
    return this.blobSpecs()?.some((spec) => blobSink(spec.weight, spec.fixed) !== 0) === true;
  }

  /** The currents' push here, px/s² (kept while the currents and the space are the same), or none. */
  private flow(): ((x: number, y: number) => readonly [number, number]) | null {
    const currents = this.currents();
    if (!currents?.length) return null;
    const key = `${this.width}x${this.height}|${JSON.stringify(currents)}`;
    if (key !== this.flowKey) {
      this.flowKey = key;
      this.flowAt = currentsFlow(currents, this.width, this.height);
    }
    return this.flowAt;
  }

  /** The blobs where their own paths put them now. */
  private paths(): BlobState[] {
    const sizes = this.blobSizes();
    const specs = this.blobSpecs();
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
      ...(specs ? specSettings(specs) : {}),
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

  /**
   * The boids' fleets with the settings of now, each its own flock (its leader's ways over the inputs): a fleet
   * kept keeps its boids; a new one is born already flying; another seed starts them all again.
   */
  private current(): BoidFleet[] {
    if (this.flockSeed !== this.seed()) {
      this.flockSeed = this.seed();
      this.flocks = [];
      this.fleets = [];
    }
    const shared = this.flockSettings();
    const born: Boids[] = [];
    const next = this.boidSpecs().map((spec, f) => {
      const settings: BoidsSettings = {
        ...shared,
        ...waysOf(spec),
        count: Math.max(0, Math.floor(spec.count)),
        colonies: Math.max(1, Math.floor(spec.colonies ?? 1)),
        origin: originOf(spec, this.width, this.height),
      };
      const old = this.flocks[f];
      if (old) {
        old.boids.configure(settings);
        return { spec, boids: old.boids };
      }
      // the first fleet keeps the seed the single flock had: the same boids as before scenes
      const boids = new Boids(settings, this.width, this.height, f === 0 ? this.seed() : this.seed() * 17 + f);
      born.push(boids);
      return { spec, boids };
    });
    this.flocks = next;
    if (born.length) {
      this.drawn = this.blobsNow();
      this.obstacles(next, this.currentFleets());
      // born already flying, unless born around a leader put somewhere: then it starts from there
      for (const boids of born) {
        if (next.find((fleet) => fleet.boids === boids && originOf(fleet.spec, 1, 1))) continue;
        for (let time = 0; time < HEAD_START; time += LONGEST_STEP) boids.step(LONGEST_STEP);
      }
    }
    return next;
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
        maxSpeed: spec.maxSpeed ?? shared.maxSpeed * BLOB_BOID_SPEED,
        minSpeed: spec.minSpeed ?? shared.minSpeed * BLOB_BOID_SPEED,
        separation: spec.separation ?? shared.separation,
        wander: spec.wander ?? shared.wander,
        sizeVariety: spec.sizeVariety ?? shared.sizeVariety,
        follow: waysOf(spec).follow ?? shared.follow,
        // kept apart by about a drop's length: a fleet of drops, not a puddle; but a flock, not a line
        // (2026-11-14: "the blob boids tend to go in a line": strong keeping apart, a strong pull to the leader
        // and a view that missed what is behind strung them out, each following the one ahead): they see all
        // round and far, stay together more than they keep apart, follow the leader lightly
        separationDistance: Math.max(shared.separationDistance, size * 3.4),
        perception: Math.max(shared.perception, size * 12),
        viewAngle: 360,
        cohesion: spec.cohesion ?? Math.max(shared.cohesion, 1.6),
        alignment: spec.alignment ?? Math.min(shared.alignment, 0.8),
        leaderPull: Math.min(shared.leaderPull ?? 0, 0.15),
        sizeSpeed: Math.min(shared.sizeSpeed ?? 0, 0.15),
        origin: originOf(spec, this.width, this.height),
      };
      const old = this.fleets[f];
      if (old && old.spec.material === spec.material) {
        old.boids.configure(settings);
        return { spec, boids: old.boids };
      }
      const boids = new Boids(settings, this.width, this.height, this.seed() * 31 + f + 1);
      // born already flying, unless born around a leader put somewhere
      if (!settings.origin) for (let time = 0; time < HEAD_START; time += LONGEST_STEP) boids.step(LONGEST_STEP);
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

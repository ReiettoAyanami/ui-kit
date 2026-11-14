import { Component, booleanAttribute, computed, input } from '@angular/core';

import { LenziBlobBackground } from '../blob-background/blob-background';
import { LenziBlobFlock, LenziBlobFlockBackground, LenziBoidFlock, LenziFleetWays, MATERIAL_LAYERS } from '../blob-flock-background/blob-flock-background';
import { DEFAULT_BLOBS } from '../engine/blob-field';
import { BlobMaterial } from '../engine/blob-materials';
import { BlobShapeName } from '../engine/shapes';
import { BoidsFollow } from '../engine/boids';
import { LenziBackgroundFill } from '../glow-background/glow-background';

/**
 * Where an object of a scene is put, as a share of the space (0 to 1 each way), and its level (z): an object
 * stops only what is on its own level (lenzi, 2026-11-14: "make every object selectable and moveable ... when
 * paused", "make the user decide the z index also by a property"). Not said: a blob's seeded place, a fleet born
 * anywhere; the level of its material (glass above, the rest on 0).
 */
export interface LenziScenePlace {
  x?: number;
  y?: number;
  layer?: number;
}

/**
 * A blob of a scene: what it is made of, its size (a share of the screen's shorter side) and its shape (lenzi,
 * 2026-11-14: "make user choose shape of blob"): kept, or (not said) changing from one into another.
 */
export interface LenziSceneBlob extends LenziScenePlace {
  material: BlobMaterial;
  size: number;
  shape?: BlobShapeName;
}

/** What a fleet's leader is, and so every one of its boids: a boid (a drop of light) or a blob-boid. */
export type LenziSceneFleetKind = 'boid' | 'blob-boid';

/**
 * A fleet of a scene: a leader and the n that follow it (lenzi, 2026-11-14: "si decide un capo e ogni capo avrá una
 * flotta di n boidi. questa flotta avrá tutte le proprietá del leader, tranne la grandezza che va configurata a parte
 * e anche il displacement della stessa"). Its ways (speeds, the three rules, wandering) are its leader's, and every
 * one of it takes them; its size and how different the sizes are (`sizeVariety`) are said apart.
 */
export interface LenziSceneFleet extends LenziFleetWays, LenziScenePlace {
  kind: LenziSceneFleetKind;
  /** A blob-boid's material (lamp when not said); boids have none. */
  material?: BlobMaterial;
  count: number;
  /** Flocks of their own inside it, each with its leader (1 when not said). */
  colonies?: number;
  /** How wide one of them is, px (boids 9, blob-boids 11 when not said). */
  size?: number;
}

/**
 * A scene (lenzi, 2026-11-14: "una Scena ... é tipo la scena che usiamo nel background della home"): a glowing
 * background as data, the blobs and the fleets behind a page, nothing else. Plain JSON, so a scene can be
 * kept, listed, and later shared by a link.
 */
export interface LenziScene {
  /** What it is called. */
  name?: string;
  blobs: readonly LenziSceneBlob[];
  fleets: readonly LenziSceneFleet[];
  /** What the boids do with the pointer ('near' when not said). */
  follow?: BoidsFollow;
  /** The pointer throws the blobs about. */
  throwable?: boolean;
}

/** What the backgrounds are given for a scene. */
export interface LenziSceneLayout {
  /** With fleets the blobs and the flocks (LenziBlobFlockBackground), without only the blobs (LenziBlobBackground). */
  flocking: boolean;
  materials: BlobMaterial[];
  sizes: number[];
  /** Each blob's place (null: its seeded one) and level. */
  homes: ({ x: number; y: number } | null)[];
  layers: number[];
  /** Each blob's own shape; null: changing. */
  shapes: (BlobShapeName | null)[];
  /** The boid fleets, each its own flock with its leader's ways. */
  boidFlocks: LenziBoidFlock[];
  /** The blob-boid fleets, each its own flock of its material. */
  blobFlocks: LenziBlobFlock[];
  follow: BoidsFollow;
  throwable: boolean;
}

/** A fleet's ways, sizes, place and level, only the ones it says. */
function fleetSettings(fleet: LenziSceneFleet): LenziFleetWays & LenziScenePlace & { colonies?: number; size?: number } {
  const out: LenziFleetWays & LenziScenePlace & { colonies?: number; size?: number } = {};
  for (const key of ['colonies', 'size', 'maxSpeed', 'minSpeed', 'separation', 'alignment', 'cohesion', 'wander', 'sizeVariety', 'x', 'y', 'layer'] as const) {
    const value = fleet[key];
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

/** A scene as the backgrounds take it: every fleet its own flock, with its leader's ways. */
export function sceneLayout(scene: LenziScene): LenziSceneLayout {
  const boidFleets = scene.fleets.filter((fleet) => fleet.kind === 'boid' && fleet.count > 0);
  const blobFleets = scene.fleets.filter((fleet) => fleet.kind === 'blob-boid' && fleet.count > 0);
  return {
    flocking: boidFleets.length + blobFleets.length > 0,
    materials: scene.blobs.map((blob) => blob.material),
    sizes: scene.blobs.map((blob) => blob.size),
    homes: scene.blobs.map((blob) => (typeof blob.x === 'number' && typeof blob.y === 'number' ? { x: blob.x, y: blob.y } : null)),
    layers: scene.blobs.map((blob) => blob.layer ?? MATERIAL_LAYERS[blob.material]),
    shapes: scene.blobs.map((blob) => blob.shape ?? null),
    boidFlocks: boidFleets.map((fleet) => ({ count: fleet.count, ...fleetSettings(fleet) })),
    blobFlocks: blobFleets.map((fleet) => ({ material: fleet.material ?? 'lamp', count: fleet.count, ...fleetSettings(fleet) })),
    follow: scene.follow ?? 'near',
    throwable: scene.throwable === true,
  };
}

/**
 * A scene behind the page (or behind a box): the blob background when it has only blobs, the blobs and their
 * flocks when it has fleets. The page's lit surfaces take its light, as they take any glowing background's.
 */
@Component({
  selector: 'lenzi-scene',
  imports: [LenziBlobBackground, LenziBlobFlockBackground],
  templateUrl: './scene.html',
  styleUrl: './scene.css',
})
export class LenziSceneBackground {
  readonly scene = input.required<LenziScene>();
  /** Behind the whole page (fixed) or behind the box it is in (`.lenzi-backdrop`). */
  readonly fill = input<LenziBackgroundFill>('page');
  /** It moves; off: a still frame. */
  readonly animate = input(true, { transform: booleanAttribute });
  /**
   * Being made (a scene maker, paused): no fleets ("the fleet should only be visible when playing the
   * simulation"), the blobs still on their places (they do not wander: "not subject to phisics"), nothing thrown.
   */
  readonly editing = input(false, { transform: booleanAttribute });

  protected readonly layout = computed(() => sceneLayout(this.scene()));
  /** No fleets, while it is being made (one list, so the background is not told something new every time). */
  protected readonly noFleets: readonly never[] = [];
  /** How far the blobs wander: the backgrounds' own, or not at all while it is being made. */
  protected readonly travel = computed(() => (this.editing() ? 0 : DEFAULT_BLOBS.travel));
}

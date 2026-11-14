import { Component, booleanAttribute, computed, input } from '@angular/core';

import { LenziBlobBackground } from '../blob-background/blob-background';
import { LenziBlobFlock, LenziBlobFlockBackground } from '../blob-flock-background/blob-flock-background';
import { BlobMaterial } from '../engine/blob-materials';
import { BoidsFollow } from '../engine/boids';
import { LenziBackgroundFill } from '../glow-background/glow-background';

/** A blob of a scene: what it is made of, and its size (a share of the screen's shorter side). */
export interface LenziSceneBlob {
  material: BlobMaterial;
  size: number;
}

/** What a fleet's leader is, and so every one of its boids: a boid (a drop of light) or a blob-boid. */
export type LenziSceneFleetKind = 'boid' | 'blob-boid';

/** A fleet of a scene: boids that fly together. */
export interface LenziSceneFleet {
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
  /** The boid fleets, as one flock: their boids, and a colony for each of their colonies. */
  boids: number;
  colonies: number;
  boidSize: number;
  blobFlocks: LenziBlobFlock[];
  follow: BoidsFollow;
  throwable: boolean;
}

/** A boid's width when its fleet does not say, px. */
const BOID_SIZE = 9;

/**
 * A scene as the backgrounds take it. The boid fleets fly as one flock today, each of their colonies a colony
 * of it (its own leader, its own way), sharing the flock's settings; a fleet of blob-boids is a fleet of its own.
 */
export function sceneLayout(scene: LenziScene): LenziSceneLayout {
  const boidFleets = scene.fleets.filter((fleet) => fleet.kind === 'boid' && fleet.count > 0);
  const blobFleets = scene.fleets.filter((fleet) => fleet.kind === 'blob-boid' && fleet.count > 0);
  return {
    flocking: boidFleets.length + blobFleets.length > 0,
    materials: scene.blobs.map((blob) => blob.material),
    sizes: scene.blobs.map((blob) => blob.size),
    boids: boidFleets.reduce((sum, fleet) => sum + fleet.count, 0),
    colonies: Math.max(1, boidFleets.reduce((sum, fleet) => sum + Math.max(1, fleet.colonies ?? 1), 0)),
    boidSize: boidFleets.find((fleet) => fleet.size !== undefined)?.size ?? BOID_SIZE,
    blobFlocks: blobFleets.map((fleet) => ({
      material: fleet.material ?? 'lamp',
      count: fleet.count,
      ...(fleet.colonies !== undefined ? { colonies: fleet.colonies } : {}),
      ...(fleet.size !== undefined ? { size: fleet.size } : {}),
    })),
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

  protected readonly layout = computed(() => sceneLayout(this.scene()));
}

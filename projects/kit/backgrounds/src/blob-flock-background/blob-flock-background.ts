import { Component, DestroyRef, inject, input, numberAttribute } from '@angular/core';

import { BlobSettings, BlobState, DEFAULT_BLOBS, MAX_BLOBS, blobEdge, blobsAt } from '../engine/blob-field';
import { BlobScene } from '../engine/blob-scene';
import { Boids, BoidsFollow, BoidsSettings, DEFAULT_BOIDS } from '../engine/boids';
import { linearToHex } from '../engine/color';
import { FlockScene } from '../engine/flock-scene';
import { GlowEngine } from '../engine/glow-engine';
import { knownShapes } from '../engine/shapes';
import { LenziGlowBackground, LenziGlowScene } from '../glow-background/glow-background';
import { LenziSourceLamp } from '../glow/light-field';
import { LenziSights } from '../sights/sights';

/** The longest step of the flock, in seconds: a slow frame does not throw the boids around. */
const LONGEST_STEP = 1 / 30;
/** How long the flock has already flown at its first picture, in seconds: it is born a flock, not a scatter. */
const HEAD_START = 3;
/** How much light a blob is, and how bright as a light on the page (as the blob background's). */
const BLOB_LIGHT = 0.5;
const BLOB_LAMP = 0.28;

/**
 * Blobs and a flock in one background (lenzi, 2026-11-14: "Make a background that is the combination of
 * flocks and blobs the latter being a obstacle for the flocks"): the blob background's blobs, and a flock
 * that flies round them, slides along their edges and is pushed aside when one drifts onto it. Both in the
 * accent colour, each object a little different. The blobs light the page's lit surfaces; the boids are
 * something to look at (LenziSights). What every glowing background does is LenziGlowBackground's.
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
  /** How it follows the pointer: not at all; around it, loosely; onto it. */
  readonly follow = input<BoidsFollow>(DEFAULT_BOIDS.follow);
  readonly followWeight = input(DEFAULT_BOIDS.followWeight, { transform: numberAttribute });
  readonly followRadius = input(DEFAULT_BOIDS.followRadius, { transform: numberAttribute });
  readonly wander = input(DEFAULT_BOIDS.wander, { transform: numberAttribute });
  /** How hard the boids turn away from the blobs: 0 they fly through them. */
  readonly avoid = input(2, { transform: numberAttribute });
  /** A boid's width, px, and its shape. */
  readonly boidSize = input(7, { transform: numberAttribute });
  readonly shape = input<'dot' | 'dart'>('dart');
  /** How long a boid's light stays behind it, 0 to 1 (the blobs leave a trail too). */
  readonly trails = input(0, { transform: numberAttribute });

  private elapsed = 0;
  private drawn: readonly BlobState[] = [];
  private flock: Boids | null = null;
  private flockSeed = 1;

  constructor() {
    super();
    // its boids are something to look at (LenziSights)
    const leave = inject(LenziSights).add(this, (point) => {
      const origin = this.origin();
      const boid = this.flock?.nearest(point.x - origin.x, point.y - origin.y);
      return boid ? { x: boid.x + origin.x, y: boid.y + origin.y } : null;
    });
    inject(DestroyRef).onDestroy(leave);
  }

  protected override trail(): number {
    return Math.min(0.97, Math.max(0, this.trails()) * 0.97);
  }

  protected override resized(width: number, height: number): void {
    this.flock?.resize(width, height);
  }

  /** The blobs light the page's lit surfaces, as the blob background's do. */
  protected override lamps(): LenziSourceLamp[] {
    const tints = this.objectColours();
    const strength = Math.max(0, this.brightness()) * (0.5 + 0.5 * Math.max(0, this.glow()));
    return this.drawn.map((blob, index) => ({
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
    const blobScene = new BlobScene(engine);
    const flockScene = new FlockScene(engine);
    return {
      advance: (delta) => {
        this.elapsed += delta;
        const flock = this.current();
        // the blobs where they are now, as drawn (their shapes, melted where they meet), are what the boids fly round
        this.drawn = this.blobsNow();
        this.obstacles(flock, this.drawn);
        flock.setTarget(this.follow() === 'none' ? null : this.pointerInside());
        for (let left = Math.min(delta, LONGEST_STEP * 2); left > 1e-5; left -= LONGEST_STEP) flock.step(Math.min(left, LONGEST_STEP));
      },
      draw: () => {
        this.drawn = this.blobsNow();
        const tints = this.objectColours();
        blobScene.draw(this.drawn, tints, this.mergePx(), Math.max(0, this.soft()), BLOB_LIGHT);
        const flock = this.current();
        flockScene.draw(flock, tints, Math.max(0.5, this.boidSize() / 2), this.shape(), 1);
      },
      dispose: () => flockScene.dispose(),
    };
  }

  /** One colour for each object: the blobs take the first ones (one array, so it is sent to the GPU once). */
  private objectColours(): Float32Array {
    return this.colours(Math.max(MAX_BLOBS, Math.min(4000, Math.floor(this.boids()))));
  }

  /** How softly the blobs join, px: as wide as they are large, the same on a phone and on a wide screen. */
  private mergePx(): number {
    return Math.max(0, this.merge()) * this.blobSize() * Math.min(this.width, this.height) * 0.5;
  }

  /**
   * The blobs as the flock's obstacles: their edge as drawn, and the boids kept outside it by their own length
   * plus the edge's softness, so no part of a boid is drawn over a blob.
   */
  private obstacles(flock: Boids, blobs: readonly BlobState[]): void {
    const pad = Math.max(0.5, this.boidSize() / 2) * 2.6 + Math.max(0, this.soft());
    flock.setField(blobs.length ? blobEdge(blobs, this.mergePx()) : null, this.avoid(), pad);
  }

  private blobsNow(): BlobState[] {
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
    };
    return blobsAt(settings, this.elapsed, this.width, this.height, null);
  }

  /** The flock with the settings of now; a new one for another seed. */
  private current(): Boids {
    const settings: BoidsSettings = {
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
    };
    if (!this.flock || this.flockSeed !== this.seed()) {
      this.flockSeed = this.seed();
      this.flock = new Boids(settings, this.width, this.height, this.flockSeed);
      this.obstacles(this.flock, this.blobsNow());
      for (let time = 0; time < HEAD_START; time += LONGEST_STEP) this.flock.step(LONGEST_STEP);
    } else {
      this.flock.configure(settings);
    }
    return this.flock;
  }
}

import { Component, booleanAttribute, input, numberAttribute } from '@angular/core';

import { BlobSettings, BlobState, DEFAULT_BLOBS, MAX_BLOBS, blobsAt } from '../engine/blob-field';
import { BlobThrow } from '../engine/blob-throw';
import { linearToHex } from '../engine/color';
import { LenziSourceLamp } from '../glow/light-field';
import { BlobScene } from '../engine/blob-scene';
import { GlowEngine } from '../engine/glow-engine';
import { knownShapes } from '../engine/shapes';
import { LenziGlowBackground, LenziGlowScene } from '../glow-background/glow-background';

/**
 * How much light a blob is at `brightness` 1. A blob is large and the page is over it: at its colour's
 * full light the page's words could not be read on it (measured: under 3:1), so it is a deep shade
 * of the accent and its glow does the shining. `brightness` raises it.
 */
const BLOB_LIGHT = 0.5;
/**
 * How bright a blob is as a light on the page's surfaces, at `brightness` and `glow` 1. Blobs are large,
 * many, and often right behind a surface: more than this and the surface's words fade (measured, 2026-11-14).
 */
const BLOB_LAMP = 0.28;

/**
 * A background of glowing blobs (lenzi, 2026-11-13: "supershapes like the ones that materialui uses,
 * and i want them to be able to merge together"): soft shapes like Material 3 Expressive's (cookies,
 * clovers, suns, rounded polygons) in the accent colour, each a little different, that drift, turn,
 * change from one shape into another and melt into each other where they meet, glowing on the page's
 * solid colour. What every glowing background does (the frame loop, reduced motion, the pointer, the
 * light on the page's lit surfaces, the still picture without WebGL2) is LenziGlowBackground's.
 */
@Component({
  selector: 'lenzi-blob-background',
  imports: [],
  templateUrl: './blob-background.html',
  styleUrls: ['../glow-background/glow-background.css', './blob-background.css'],
})
export class LenziBlobBackground extends LenziGlowBackground {
  /** How many blobs, 16 at most. */
  readonly count = input(DEFAULT_BLOBS.count, { transform: numberAttribute });
  /** A blob's radius, as a share of the smaller side of the space (0.2: a fifth of it). */
  readonly size = input(DEFAULT_BLOBS.size, { transform: numberAttribute });
  /** How much the blobs differ in size, 0 (all the same) to 1. */
  readonly sizeVariety = input(DEFAULT_BLOBS.sizeVariety, { transform: numberAttribute });
  /** How far a blob wanders from its place, 0 to 1. */
  readonly travel = input(DEFAULT_BLOBS.travel, { transform: numberAttribute });
  /** How fast the shapes change into one another: 0 never, 1 about every 6 seconds. */
  readonly morph = input(DEFAULT_BLOBS.morph, { transform: numberAttribute });
  /** How fast they turn, in turns a minute. */
  readonly spin = input(DEFAULT_BLOBS.spin, { transform: numberAttribute });
  /** The shapes they take (BLOB_SHAPES' names); names it does not know are left out. */
  readonly shapes = input<readonly string[]>(DEFAULT_BLOBS.shapes);
  /** How softly two blobs join, 0 (they only overlap) to 1 (they melt from far away). */
  readonly merge = input(0.35, { transform: numberAttribute });
  /** How soft a blob's edge is, in px. */
  readonly soft = input(2, { transform: numberAttribute });
  /** How much the pointer draws them, 0 (not at all) to 1. */
  readonly pull = input(DEFAULT_BLOBS.pull, { transform: numberAttribute });
  /**
   * The pointer can take a blob and throw it (lenzi, 2026-11-14: "drag the blobs around ... kinda like
   * throwing them around"): it flies on, slows down, bounces off the edges and drifts back to its path.
   */
  readonly throwable = input(false, { transform: booleanAttribute });

  private elapsed = 0;
  private readonly throws = new BlobThrow();
  /** The blobs of the last picture, for the light they shed on the page. */
  private drawn: readonly BlobState[] = [];

  /**
   * Every blob is a light for the page's lit surfaces (lenzi, 2026-11-14: "the light of the blobs should
   * act more like this on the glass surfaces"): from where it is, in its colour, reaching a little past
   * its own size; solid elements cast shadows from it.
   */
  protected override lamps(): LenziSourceLamp[] {
    const tints = this.colours(MAX_BLOBS);
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
    const scene = new BlobScene(engine);
    return {
      advance: (delta) => {
        this.elapsed += delta;
        this.throws.step(delta, this.paths(), this.width, this.height);
      },
      draw: () => {
        const blobs = this.throws.apply(this.paths());
        this.drawn = blobs;
        // the join is as wide as the blobs are large: the same picture on a phone and on a wide screen
        const radius = this.size() * Math.min(this.width, this.height);
        scene.draw(blobs, this.colours(MAX_BLOBS), Math.max(0, this.merge()) * radius * 0.5, Math.max(0, this.soft()), BLOB_LIGHT);
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

  /** The blobs where their own paths put them now. */
  private paths(): BlobState[] {
    const settings: BlobSettings = {
      count: this.count(),
      size: this.size(),
      sizeVariety: this.sizeVariety(),
      travel: this.travel(),
      morph: this.morph(),
      spin: this.spin(),
      shapes: knownShapes(this.shapes()),
      pull: this.pull(),
      seed: this.seed(),
    };
    return blobsAt(settings, this.elapsed, this.width, this.height, this.pointerInside());
  }
}

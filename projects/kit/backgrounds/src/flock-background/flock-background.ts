import { Component, DestroyRef, inject, input, numberAttribute } from '@angular/core';

import { Boids, BoidsFollow, BoidsSettings, DEFAULT_BOIDS } from '../engine/boids';
import { BoidShape, FlockScene } from '../engine/flock-scene';
import { GlowEngine } from '../engine/glow-engine';
import { LenziGlowBackground, LenziGlowScene } from '../glow-background/glow-background';
import { LenziScares } from '../scare/scares';
import { LenziSights } from '../sights/sights';

/** The longest step of the flock, in seconds: a slow frame does not throw the boids around. */
const LONGEST_STEP = 1 / 30;
/** How long the flock has already flown at its first picture, in seconds: it is born a flock, not a scatter. */
const HEAD_START = 3;

/**
 * A background of a glowing flock (lenzi, 2026-11-13: "The flocks need to be following the mouse
 * (either approximately or like a precise target), need to behave like a normal flocking animation
 * and every variable should be configurable"): boids in the accent colour, each a little different,
 * that keep apart, head the same way and stay together, around the pointer (`follow="near"`) or onto
 * it (`follow="target"`), glowing on the page's solid colour. Every number of the flock is an input.
 * What every glowing background does is LenziGlowBackground's.
 */
@Component({
  selector: 'lenzi-flock-background',
  imports: [],
  templateUrl: './flock-background.html',
  styleUrls: ['../glow-background/glow-background.css', './flock-background.css'],
})
export class LenziFlockBackground extends LenziGlowBackground {
  /** How many boids, 4000 at most. */
  readonly count = input(DEFAULT_BOIDS.count, { transform: numberAttribute });
  /** How many flocks of their own: each heads its own way and keeps apart from the others. */
  readonly colonies = input(1, { transform: numberAttribute });
  /** The fastest and the slowest a boid flies, px a second. */
  readonly maxSpeed = input(DEFAULT_BOIDS.maxSpeed, { transform: numberAttribute });
  readonly minSpeed = input(DEFAULT_BOIDS.minSpeed, { transform: numberAttribute });
  /** How hard it can turn, px/s²: small is lazy and wide, large is nervous. */
  readonly maxForce = input(DEFAULT_BOIDS.maxForce, { transform: numberAttribute });
  /** How far it sees the others, px, and how wide, in degrees around its heading. */
  readonly perception = input(DEFAULT_BOIDS.perception, { transform: numberAttribute });
  readonly viewAngle = input(DEFAULT_BOIDS.viewAngle, { transform: numberAttribute });
  /** Closer than this, px, it moves away. */
  readonly separationDistance = input(DEFAULT_BOIDS.separationDistance, { transform: numberAttribute });
  /** The weight of each rule: keep apart, head the same way, stay together. */
  readonly separation = input(DEFAULT_BOIDS.separation, { transform: numberAttribute });
  readonly alignment = input(DEFAULT_BOIDS.alignment, { transform: numberAttribute });
  readonly cohesion = input(DEFAULT_BOIDS.cohesion, { transform: numberAttribute });
  /** How it follows the pointer: not at all; around it, loosely; onto it, slowing to a stop. */
  readonly follow = input<BoidsFollow>(DEFAULT_BOIDS.follow);
  /** The weight of the pointer, and the distance from it, px, where the pull fades ("near") or they slow down ("target"). */
  readonly followWeight = input(DEFAULT_BOIDS.followWeight, { transform: numberAttribute });
  readonly followRadius = input(DEFAULT_BOIDS.followRadius, { transform: numberAttribute });
  /** How much each boid turns by itself, at random: 0 none. */
  readonly wander = input(DEFAULT_BOIDS.wander, { transform: numberAttribute });
  /** At the edges: come back in from the other side, or turn away before them (from `edgeMargin` px). */
  readonly edges = input<'wrap' | 'avoid'>(DEFAULT_BOIDS.edges);
  readonly edgeMargin = input(DEFAULT_BOIDS.edgeMargin, { transform: numberAttribute });
  /** A boid's width, in px. */
  readonly boidSize = input(7, { transform: numberAttribute });
  /** A dot, or a dart that points where it flies. */
  readonly shape = input<BoidShape>('dart');
  /** How long a boid's light stays behind it, 0 (no trail) to 1. */
  readonly trails = input(0, { transform: numberAttribute });

  /** How much the boids are scared of the page's `lenziScare` elements: 0 not at all. */
  readonly scare = input(3, { transform: numberAttribute });

  private flock: Boids | null = null;
  private flockSeed = 1;
  private readonly scares = inject(LenziScares);

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
    // a trail of 1 would never fade
    return Math.min(0.97, Math.max(0, this.trails()) * 0.97);
  }

  protected override resized(width: number, height: number): void {
    this.flock?.resize(width, height);
  }

  protected override createScene(engine: GlowEngine): LenziGlowScene {
    const scene = new FlockScene(engine);
    return {
      advance: (delta) => {
        const flock = this.current();
        flock.setTarget(this.follow() === 'none' ? null : this.pointerInside());
        // the page's lenziScare elements, in the space
        const origin = this.origin();
        flock.setScares(
          this.scares.circles().map((circle) => ({ x: circle.x - origin.x, y: circle.y - origin.y, radius: circle.radius })),
          this.scare(),
        );
        // two steps for a slow frame, so the flock flies as far as the time that went by
        for (let left = Math.min(delta, LONGEST_STEP * 2); left > 1e-5; left -= LONGEST_STEP) flock.step(Math.min(left, LONGEST_STEP));
      },
      draw: () => {
        const flock = this.current();
        scene.draw(flock, this.colours(flock.count), Math.max(0.5, this.boidSize() / 2), this.shape(), 1);
      },
      dispose: () => scene.dispose(),
    };
  }

  /** The flock with the settings of now; a new one for another seed. */
  private current(): Boids {
    const settings: BoidsSettings = {
      count: this.count(),
      maxSpeed: this.maxSpeed(),
      minSpeed: this.minSpeed(),
      maxForce: this.maxForce(),
      perception: this.perception(),
      viewAngle: this.viewAngle(),
      separationDistance: this.separationDistance(),
      separation: this.separation(),
      alignment: this.alignment(),
      cohesion: this.cohesion(),
      follow: this.follow(),
      followWeight: this.followWeight(),
      followRadius: this.followRadius(),
      wander: this.wander(),
      edges: this.edges(),
      edgeMargin: this.edgeMargin(),
      colonies: this.colonies(),
    };
    if (!this.flock || this.flockSeed !== this.seed()) {
      this.flockSeed = this.seed();
      this.flock = new Boids(settings, this.width, this.height, this.flockSeed);
      for (let time = 0; time < HEAD_START; time += LONGEST_STEP) this.flock.step(LONGEST_STEP);
    } else {
      this.flock.configure(settings);
    }
    return this.flock;
  }
}

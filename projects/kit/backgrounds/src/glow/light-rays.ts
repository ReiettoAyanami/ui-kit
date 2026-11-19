import { ChangeDetectionStrategy, Component, DOCUMENT, DestroyRef, ElementRef, afterNextRender, inject, input, numberAttribute, viewChild } from '@angular/core';

import { LenziSights } from '../sights/sights';
import { LenziLightBlockers } from './light-blockers';

/** A light's glow on the light picture, times its own radius. */
const GLOW = 2.4;

/**
 * Light coming through the page towards whoever looks (lenzi, 2026-11-19: "io voglio vedere che ci sono dei fasci di
 * luce che mi arrivano contro e che il testo è in ombra secondo questa cosa ... i boidi sono fatti di luce e il testo
 * blocca luce. Boidi > Testo > Utente"): over the page, the beams of the lights of a glowing background behind it (its
 * lamp drops and lamp blobs: `LenziSights.lights`), with the shape of every solid word (`lenziSolidText`) cut out of
 * them, so each word throws a shaft of shadow towards the viewer.
 *
 * How: the lights drawn soft on a small picture, the words cut out of it, then that picture stretched out from the
 * middle of the lights, step by step, fainter each step (light scattered in the air: a bright place becomes a beam,
 * a word a dark shaft), added over the page. One a page, after the page's content.
 */
@Component({
  selector: 'lenzi-light-rays',
  template: '<canvas #canvas class="lenzi-light-rays-canvas" aria-hidden="true"></canvas>',
  host: { class: 'lenzi-light-rays', 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LenziLightRays {
  /** How bright the beams are, 0 to 1. */
  readonly strength = input(0.35, { transform: numberAttribute });
  /** How far the beams reach: the picture stretched to 1 + this from the middle of the lights. */
  readonly length = input(0.3, { transform: numberAttribute });
  /** How many steps make a beam (more: smoother, slower). */
  readonly steps = input(40, { transform: numberAttribute });
  /** How much fainter each step is than the last, 0 to 1. */
  readonly decay = input(0.94, { transform: numberAttribute });
  /** The picture's size, a share of the window's (the beams are soft: a half is plenty). */
  readonly resolution = input(0.5, { transform: numberAttribute });

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly sights = inject(LenziSights);
  private readonly blockers = inject(LenziLightBlockers);
  private readonly document = inject(DOCUMENT);
  private light: HTMLCanvasElement | null = null;
  private readonly sprites = new Map<string, HTMLCanvasElement>();
  private frame: number | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!view) return;
      const tick = () => {
        this.draw();
        this.frame = view.requestAnimationFrame(tick);
      };
      tick();
      destroyRef.onDestroy(() => {
        if (this.frame !== null) view.cancelAnimationFrame(this.frame);
      });
    });
  }

  /** A soft round light of a colour, drawn once. */
  private sprite(colour: string): HTMLCanvasElement {
    let sprite = this.sprites.get(colour);
    if (sprite) return sprite;
    sprite = this.document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const context = sprite.getContext('2d');
    if (context) {
      const glow = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      glow.addColorStop(0, colour);
      glow.addColorStop(0.35, colour);
      glow.addColorStop(1, 'transparent');
      context.fillStyle = glow;
      context.fillRect(0, 0, 64, 64);
    }
    this.sprites.set(colour, sprite);
    return sprite;
  }

  private draw(): void {
    const view = this.document.defaultView;
    const canvas = this.canvas().nativeElement;
    const output = canvas.getContext('2d');
    if (!view || !output) return;
    const scale = Math.min(1, Math.max(0.1, this.resolution()));
    const width = Math.max(1, Math.round(view.innerWidth * scale));
    const height = Math.max(1, Math.round(view.innerHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    output.setTransform(1, 0, 0, 1, 0, 0);
    output.clearRect(0, 0, width, height);
    const lights = this.sights.lights().filter((light) => light.x > -200 && light.y > -200 && light.x < view.innerWidth + 200 && light.y < view.innerHeight + 200);
    if (lights.length === 0 || this.strength() <= 0) return;

    // the light coming through the page: every light soft, then the words cut out of it
    const picture = (this.light ??= this.document.createElement('canvas'));
    if (picture.width !== width || picture.height !== height) {
      picture.width = width;
      picture.height = height;
    }
    const context = picture.getContext('2d');
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, width, height);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.globalCompositeOperation = 'lighter';
    let middleX = 0;
    let middleY = 0;
    let weight = 0;
    for (const light of lights) {
      const size = light.radius * GLOW * 2;
      context.drawImage(this.sprite(light.colour), light.x - size / 2, light.y - size / 2, size, size);
      middleX += light.x * light.radius;
      middleY += light.y * light.radius;
      weight += light.radius;
    }
    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = '#000';
    for (const blocker of this.blockers.all()) blocker.draw(context);

    // the beams: the picture stretched out from the middle of the lights, step by step, fainter each step
    const cx = (middleX / weight) * scale;
    const cy = (middleY / weight) * scale;
    const steps = Math.max(2, Math.floor(this.steps()));
    const decay = Math.min(1, Math.max(0, this.decay()));
    const length = Math.max(0, this.length());
    const strength = Math.min(1, Math.max(0, this.strength()));
    let total = 0;
    for (let i = 0; i < steps; i++) total += decay ** i;
    output.globalCompositeOperation = 'lighter';
    for (let i = 0; i < steps; i++) {
      const stretch = 1 + (length * i) / (steps - 1);
      output.globalAlpha = (strength * decay ** i) / total * 2;
      output.drawImage(picture, cx - cx * stretch, cy - cy * stretch, width * stretch, height * stretch);
    }
    output.globalAlpha = 1;
  }
}

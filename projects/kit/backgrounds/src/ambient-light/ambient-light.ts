import { DOCUMENT, Injectable, inject } from '@angular/core';

/** Where the light's picture is on the screen (the background's box), in px from the window's top left. */
export interface LenziLightArea {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The light a glowing background sheds on the page (lenzi, 2026-11-13: "the glow in the light should
 * behave like the youtube backlight feature where elements get slightly alominated by it"). The
 * background gives it a very small picture of its light a few times a second; every lit surface
 * (`lenziLit`) shows the part of that picture that is behind it, over what it holds (`.lenzi-lit`'s
 * `::before`, as much as `--lenzi-lit-veil` says) and along its border (`::after`, `--lenzi-lit-rim`).
 * Nothing is added inside the surface, and nothing is read from the GPU while no surface wants the light.
 */
@Injectable({
  providedIn: 'root',
})
export class LenziAmbientLight {
  private readonly document = inject(DOCUMENT);
  /** Every lit surface. */
  private readonly surfaces = new Set<HTMLElement>();
  private source: object | null = null;
  private area: (() => LenziLightArea) | null = null;
  /** The picture twice, as the styles show it: for the veil and for the border (their amounts in its alpha). */
  private veil = '';
  private rim = '';
  private blend = 'screen';
  private encoder: { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } | null = null;
  private placing: number | null = null;
  private listening = false;
  private readonly onMove = () => this.placeSoon();

  /** Whether a surface wants the light: a background reads its light back only then. */
  get wanted(): boolean {
    return this.surfaces.size > 0;
  }

  /** A surface wants the light (`lenziLit` calls it). Gives back how to stop. */
  attach(surface: HTMLElement): () => void {
    this.surfaces.add(surface);
    this.listen();
    this.show(surface);
    return () => {
      this.clear(surface);
      this.surfaces.delete(surface);
      if (this.surfaces.size === 0) this.unlisten();
    };
  }

  /**
   * A background's light, now: `pixels` is r, g, b, a for `width` × `height` px, the top row first;
   * `area` says where the background is on the screen; `light` is a light base colour (the light
   * then darkens surfaces with its colour instead of brightening them).
   */
  shine(source: object, pixels: Uint8Array, width: number, height: number, area: () => LenziLightArea, light = false): void {
    const root = this.document.defaultView?.getComputedStyle(this.document.documentElement);
    const amount = (name: string, otherwise: number) => {
      const value = parseFloat(root?.getPropertyValue(name) ?? '');
      return Number.isFinite(value) ? Math.min(1, Math.max(0, value / 100)) : otherwise;
    };
    const veil = this.encode(pixels, width, height, amount('--lenzi-lit-veil', 0.34));
    const rim = veil ? this.encode(pixels, width, height, amount('--lenzi-lit-rim', 0.8)) : null;
    if (!veil || !rim) return;
    this.source = source;
    this.area = area;
    this.veil = veil;
    this.rim = rim;
    this.blend = light ? 'multiply' : 'screen';
    this.place();
  }

  /** The background is gone, or stopped shining: its light goes (another background's stays). */
  dim(source: object): void {
    if (this.source !== source) return;
    this.source = null;
    this.area = null;
    this.veil = this.rim = '';
    for (const surface of this.surfaces) this.clear(surface);
  }

  /** The picture as a PNG the styles can show, its alpha `amount`; null where the browser draws no canvas (a test). */
  private encode(pixels: Uint8Array, width: number, height: number, amount: number): string | null {
    if (!this.encoder) {
      const canvas = this.document.createElement('canvas');
      let context: CanvasRenderingContext2D | null = null;
      try {
        context = canvas.getContext('2d');
      } catch {
        context = null;
      }
      if (!context) return null;
      this.encoder = { canvas, context };
    }
    const { canvas, context } = this.encoder;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const picture = context.createImageData(width, height);
    picture.data.set(pixels.subarray(0, width * height * 4));
    const alpha = Math.round(amount * 255);
    for (let i = 3; i < picture.data.length; i += 4) picture.data[i] = alpha;
    context.putImageData(picture, 0, 0);
    return canvas.toDataURL('image/png');
  }

  /** Every surface shows the part of the light that is behind it. */
  private place(): void {
    for (const surface of this.surfaces) this.show(surface);
  }

  private show(surface: HTMLElement): void {
    if (!this.area || !this.veil) {
      this.clear(surface);
      return;
    }
    const area = this.area();
    const box = surface.getBoundingClientRect();
    const layer = (image: string) => `url("${image}") ${area.left - box.left}px ${area.top - box.top}px / ${area.width}px ${area.height}px no-repeat`;
    surface.style.setProperty('--lenzi-ambient-veil', layer(this.veil));
    surface.style.setProperty('--lenzi-ambient-rim', layer(this.rim));
    surface.style.setProperty('--lenzi-light-blend', this.blend);
  }

  private clear(surface: HTMLElement): void {
    for (const name of ['--lenzi-ambient-veil', '--lenzi-ambient-rim', '--lenzi-light-blend']) surface.style.removeProperty(name);
  }

  /** The page scrolled or changed size: the surfaces moved over the light. Once a frame at most. */
  private placeSoon(): void {
    const view = this.document.defaultView;
    if (this.placing !== null || !view || !this.veil) return;
    this.placing = view.requestAnimationFrame(() => {
      this.placing = null;
      this.place();
    });
  }

  private listen(): void {
    const view = this.document.defaultView;
    if (this.listening || !view) return;
    this.listening = true;
    // capture: a scroll inside any box of the page moves its surfaces too
    this.document.addEventListener('scroll', this.onMove, { capture: true, passive: true });
    view.addEventListener('resize', this.onMove, { passive: true });
  }

  private unlisten(): void {
    const view = this.document.defaultView;
    if (!this.listening || !view) return;
    this.listening = false;
    this.document.removeEventListener('scroll', this.onMove, { capture: true });
    view.removeEventListener('resize', this.onMove);
    if (this.placing !== null) view.cancelAnimationFrame(this.placing);
    this.placing = null;
  }
}

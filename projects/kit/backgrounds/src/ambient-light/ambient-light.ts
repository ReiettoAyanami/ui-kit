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
 * (`lenziLit`) shows the part of that picture that is behind it, as a veil over its colour and along
 * its border. Nothing is read from the GPU while no surface wants the light.
 */
@Injectable({
  providedIn: 'root',
})
export class LenziAmbientLight {
  private readonly document = inject(DOCUMENT);
  /** Every lit surface, and the element that shows the light on it. */
  private readonly surfaces = new Map<HTMLElement, HTMLElement>();
  private source: object | null = null;
  private area: (() => LenziLightArea) | null = null;
  private image = '';
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
    const light = this.document.createElement('span');
    light.className = 'lenzi-lit-light';
    light.setAttribute('aria-hidden', 'true');
    // over the surface's border too, where the surface does not cut what leaves its inside
    const style = this.document.defaultView?.getComputedStyle(surface);
    if (style && style.overflowX === 'visible' && style.overflowY === 'visible') {
      light.style.inset = `-${style.borderTopWidth} -${style.borderRightWidth} -${style.borderBottomWidth} -${style.borderLeftWidth}`;
    }
    surface.prepend(light);
    this.surfaces.set(surface, light);
    this.listen();
    this.show(light);
    return () => {
      light.remove();
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
    const encoded = this.encode(pixels, width, height);
    if (!encoded) return;
    this.source = source;
    this.area = area;
    this.image = `url("${encoded}")`;
    this.blend = light ? 'multiply' : 'screen';
    this.place();
  }

  /** The background is gone, or stopped shining: its light goes (another background's stays). */
  dim(source: object): void {
    if (this.source !== source) return;
    this.source = null;
    this.area = null;
    this.image = '';
    for (const light of this.surfaces.values()) light.classList.remove('lenzi-lit-on');
  }

  /** The picture as a PNG the styles can show; null where the browser draws no canvas (a test). */
  private encode(pixels: Uint8Array, width: number, height: number): string | null {
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
    context.putImageData(picture, 0, 0);
    return canvas.toDataURL('image/png');
  }

  /** Every surface shows the part of the light that is behind it. */
  private place(): void {
    for (const light of this.surfaces.values()) this.show(light);
  }

  private show(light: HTMLElement): void {
    if (!this.area || !this.image) {
      light.classList.remove('lenzi-lit-on');
      return;
    }
    const area = this.area();
    const box = light.getBoundingClientRect();
    light.style.setProperty('--lenzi-light-image', this.image);
    light.style.setProperty('--lenzi-light-size', `${area.width}px ${area.height}px`);
    light.style.setProperty('--lenzi-light-at', `${area.left - box.left}px ${area.top - box.top}px`);
    light.style.setProperty('--lenzi-light-blend', this.blend);
    light.classList.add('lenzi-lit-on');
  }

  /** The page scrolled or changed size: the surfaces moved over the light. Once a frame at most. */
  private placeSoon(): void {
    const view = this.document.defaultView;
    if (this.placing !== null || !view || !this.image) return;
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

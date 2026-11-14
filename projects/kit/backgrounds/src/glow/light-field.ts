import { DOCUMENT, Injectable, inject } from '@angular/core';

/** What a lamp shines with, read at every frame (an input that changes is seen at once). */
export interface LenziLamp {
  /** On or off: off, it fades out. */
  on: boolean;
  /** Its colour: any CSS colour, or a variable's name (`'--mat-sys-primary'`). */
  color: string;
  /** How bright, 0 (nothing) to 2; 1 is the kit's lamp. */
  strength: number;
  /** How far its light reaches, CSS px. */
  reach: number;
}

/** The most lamps that light one surface at once (the nearest). */
export const MOST_LAMPS = 6;

/** How long a lamp takes to switch on or off, seconds (none with reduced motion). */
const FADE = 0.16;

interface LampEntry {
  element: HTMLElement;
  read: () => LenziLamp;
  /** How much of its light is on now, 0..1: it follows `on` softly. */
  level: number;
}

interface SurfaceEntry {
  element: HTMLElement;
  /** The element inside the surface that shows the lamps' light; made when a lamp first reaches it. */
  layer: HTMLElement | null;
  /** What was last written on it, so a frame where nothing moved writes nothing. */
  written: string;
}

/** A CSS variable as its `var()`, any other colour as it is. */
export const cssColor = (color: string): string => (color.trim().startsWith('--') ? `var(${color.trim()})` : color.trim());

/**
 * The light that glowing elements (`lenziGlow`) shed on the elements around them, on the same plane as
 * them (lenzi, 2026-11-14: "a lit surface and projects light directly onto the others component ...
 * this elements must act on the same plain as the other elements unlike the background", and "ovviamente
 * la luce di tutti i colori"). Every frame while a lamp is on, it measures where the lamps and the lit
 * surfaces (`lenziLit`) are on the screen, and lays on each surface the light of the lamps that reach it:
 * a glow from the side that faces each lamp, in the lamp's colour, brighter the nearer it is; the lights
 * of several lamps add up. Nothing runs while no lamp is on, and a frame where nothing moved writes
 * nothing.
 */
@Injectable({
  providedIn: 'root',
})
export class LenziLightField {
  private readonly document = inject(DOCUMENT);
  private readonly lamps = new Map<HTMLElement, LampEntry>();
  private readonly surfaces = new Map<HTMLElement, SurfaceEntry>();
  private frame: number | null = null;
  private last = 0;

  /** A lamp (`lenziGlow`): `read` says how it shines now. Gives back how to take it away. */
  addLamp(element: HTMLElement, read: () => LenziLamp): () => void {
    this.lamps.set(element, { element, read, level: 0 });
    this.wake();
    return () => {
      this.lamps.delete(element);
      this.wake();
    };
  }

  /** A surface that takes the lamps' light (`lenziLit`). Gives back how to take it away. */
  addSurface(element: HTMLElement): () => void {
    this.surfaces.set(element, { element, layer: null, written: '' });
    this.wake();
    return () => {
      this.surfaces.get(element)?.layer?.remove();
      this.surfaces.delete(element);
    };
  }

  /** Something changed (a lamp switched on, an element came): the frames start again if they stopped. */
  wake(): void {
    const view = this.document.defaultView;
    if (this.frame !== null || !view?.requestAnimationFrame) return;
    this.last = view.performance.now();
    this.frame = view.requestAnimationFrame((now) => this.tick(now));
  }

  /** One frame: every surface takes the light of the lamps that reach it now. */
  update(delta = 1): boolean {
    const view = this.document.defaultView;
    const still = view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const step = still ? 1 : 1 - Math.exp(-delta / FADE);

    // first every measure, then every write: the page is laid out once a frame
    const shining: { entry: LampEntry; lamp: LenziLamp; box: DOMRect }[] = [];
    let moving = false;
    for (const entry of this.lamps.values()) {
      const lamp = entry.read();
      const target = lamp.on ? 1 : 0;
      entry.level += (target - entry.level) * step;
      if (Math.abs(target - entry.level) < 0.004) entry.level = target;
      else moving = true;
      if (entry.level > 0 && lamp.strength > 0 && lamp.reach > 0) shining.push({ entry, lamp, box: entry.element.getBoundingClientRect() });
    }
    const boxes = [...this.surfaces.values()].map((surface) => ({ surface, box: surface.element.getBoundingClientRect(), layerBox: surface.layer?.getBoundingClientRect() ?? null }));

    for (const { surface, box, layerBox } of boxes) {
      const reaching = shining
        .filter(({ entry }) => entry.element !== surface.element)
        .map((light) => ({ ...light, distance: gap(box, light.box) }))
        .filter(({ distance, lamp }) => distance < lamp.reach)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, MOST_LAMPS);
      if (reaching.length === 0) {
        this.write(surface, '');
        continue;
      }
      const layer = surface.layer ?? this.makeLayer(surface);
      const origin = layerBox ?? layer.getBoundingClientRect();
      const centre = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      const gradients = reaching.map(({ lamp, box: from, entry }) => {
        // the light comes from the lamp's side that faces this surface
        const x = clamp(centre.x, from.left, from.right) - origin.left;
        const y = clamp(centre.y, from.top, from.bottom) - origin.top;
        const strength = Math.min(2, Math.max(0, lamp.strength)) * entry.level;
        const colour = cssColor(lamp.color);
        const at = (share: number) => `color-mix(in srgb, ${colour} ${Math.round(Math.min(100, 100 * strength * share))}%, transparent)`;
        // near the lamp the light is strong, then fades slowly: a light, not a disc
        return `radial-gradient(circle ${Math.round(lamp.reach)}px at ${Math.round(x)}px ${Math.round(y)}px, ${at(1)}, ${at(0.82)} 15%, ${at(0.5)} 38%, ${at(0.2)} 68%, transparent)`;
      });
      this.write(surface, gradients.join(', '));
    }

    return shining.length > 0 || moving;
  }

  private tick(now: number): void {
    this.frame = null;
    const delta = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    const view = this.document.defaultView;
    // a hidden tab: nothing to see; the frames start again with the next change
    if (this.document.hidden) {
      this.document.addEventListener('visibilitychange', () => this.wake(), { once: true });
      return;
    }
    const again = this.update(delta);
    if (again && view) this.frame = view.requestAnimationFrame((next) => this.tick(next));
    else this.clearAll();
  }

  private write(surface: SurfaceEntry, image: string): void {
    if (image === surface.written) return;
    surface.written = image;
    const layer = surface.layer;
    if (!layer) return;
    layer.style.setProperty('--lenzi-lamps', image || 'none');
    layer.classList.toggle('lenzi-lit-lamps-on', image !== '');
  }

  private clearAll(): void {
    for (const surface of this.surfaces.values()) this.write(surface, '');
  }

  private makeLayer(surface: SurfaceEntry): HTMLElement {
    const layer = this.document.createElement('span');
    layer.className = 'lenzi-lit-lamps';
    layer.setAttribute('aria-hidden', 'true');
    // over the surface's border too, where the surface does not cut what leaves its inside
    const style = this.document.defaultView?.getComputedStyle(surface.element);
    if (style && style.overflowX === 'visible' && style.overflowY === 'visible') {
      layer.style.inset = `-${style.borderTopWidth} -${style.borderRightWidth} -${style.borderBottomWidth} -${style.borderLeftWidth}`;
    }
    surface.element.prepend(layer);
    surface.layer = layer;
    return layer;
  }
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** How far apart two boxes are, px (0 when they touch or overlap). */
function gap(a: DOMRect, b: DOMRect): number {
  const dx = Math.max(0, b.left - a.right, a.left - b.right);
  const dy = Math.max(0, b.top - a.bottom, a.top - b.bottom);
  return Math.hypot(dx, dy);
}

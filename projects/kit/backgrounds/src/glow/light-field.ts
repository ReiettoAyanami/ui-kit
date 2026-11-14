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

/** How much of its own light a lamp lays over what it holds (a toggle's chosen segment, a list's rows). */
const OWN_LIGHT = 0.3;

interface LampEntry {
  element: HTMLElement;
  read: () => LenziLamp;
  /** How much of its light is on now, 0..1: it follows `on` softly. */
  level: number;
}

interface SurfaceEntry {
  element: HTMLElement;
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
 * surfaces (`lenziLit`) are on the screen, and gives each surface the light of the lamps that reach it:
 * a glow from the side that faces each lamp, in the lamp's colour, brighter the nearer it is; the lights
 * of several lamps add up. The surface shows it over everything it holds (`.lenzi-lit`'s `::before`, and
 * its border in `::after`): nothing is added inside it. Nothing runs while no lamp is on, and a frame
 * where nothing moved writes nothing.
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
    this.surfaces.set(element, { element, written: '' });
    this.wake();
    return () => {
      const surface = this.surfaces.get(element);
      if (surface) this.write(surface, '', '');
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

  /** One frame: every surface takes the light of the lamps that reach it now. Says whether to go on. */
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
    const boxes = [...this.surfaces.values()].map((surface) => ({ surface, box: surface.element.getBoundingClientRect() }));

    for (const { surface, box } of boxes) {
      const reaching = shining
        .filter(({ entry }) => entry.element !== surface.element)
        .map((light) => ({ ...light, distance: gap(box, light.box) }))
        .filter(({ distance, lamp }) => distance < lamp.reach)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, MOST_LAMPS);
      const own = shining.find(({ entry }) => entry.element === surface.element);
      if (reaching.length === 0 && !own) {
        this.write(surface, '', '');
        continue;
      }
      const centre = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      const layers = (amount: string) => {
        const list = reaching.map(({ lamp, box: from, entry }) => {
          // the light comes from the lamp's side that faces this surface, from where the surface's box starts
          const x = clamp(centre.x, from.left, from.right) - box.left;
          const y = clamp(centre.y, from.top, from.bottom) - box.top;
          const strength = Math.min(2, Math.max(0, lamp.strength)) * entry.level;
          const at = (share: number) => mix(lamp.color, amount, strength * share);
          // near the lamp the light is strong, then fades slowly: a light, not a disc
          return `radial-gradient(circle ${Math.round(lamp.reach)}px at ${Math.round(x)}px ${Math.round(y)}px, ${at(1)}, ${at(0.82)} 15%, ${at(0.5)} 38%, ${at(0.2)} 68%, transparent)`;
        });
        if (own) {
          // a lamp lights what it holds too, evenly
          const tint = mix(own.lamp.color, amount, Math.min(2, Math.max(0, own.lamp.strength)) * own.entry.level * OWN_LIGHT);
          list.push(`linear-gradient(${tint}, ${tint})`);
        }
        return list.join(', ');
      };
      this.write(surface, layers('--lenzi-glow-veil'), layers('--lenzi-glow-rim'));
    }

    return shining.length > 0 || moving;
  }

  private tick(now: number): void {
    this.frame = null;
    const delta = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    const view = this.document.defaultView;
    // a hidden tab: nothing to see; the frames start again when it is seen
    if (this.document.hidden) {
      this.document.addEventListener('visibilitychange', () => this.wake(), { once: true });
      return;
    }
    const again = this.update(delta);
    if (again && view) this.frame = view.requestAnimationFrame((next) => this.tick(next));
    else for (const surface of this.surfaces.values()) this.write(surface, '', '');
  }

  private write(surface: SurfaceEntry, veil: string, rim: string): void {
    const written = `${veil}|${rim}`;
    if (written === surface.written) return;
    surface.written = written;
    const style = surface.element.style;
    if (veil) {
      style.setProperty('--lenzi-lamps-veil', veil);
      style.setProperty('--lenzi-lamps-rim', rim);
    } else {
      style.removeProperty('--lenzi-lamps-veil');
      style.removeProperty('--lenzi-lamps-rim');
    }
  }
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * The lamp's colour, `share` of it (1: as much as the variable `amount` says), the rest transparent: the
 * global variable is read by the browser, so changing it changes every light at once.
 */
function mix(color: string, amount: string, share: number): string {
  return `color-mix(in srgb, ${cssColor(color)} min(100%, calc(var(${amount}) * ${Math.round(share * 1000) / 1000})), transparent)`;
}

/** How far apart two boxes are, px (0 when they touch or overlap). */
function gap(a: DOMRect, b: DOMRect): number {
  const dx = Math.max(0, b.left - a.right, a.left - b.right);
  const dy = Math.max(0, b.top - a.bottom, a.top - b.bottom);
  return Math.hypot(dx, dy);
}

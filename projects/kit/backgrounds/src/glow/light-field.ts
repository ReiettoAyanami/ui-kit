import { DOCUMENT, Injectable, inject } from '@angular/core';

import { LIGHT_WORKLET } from './light-worklet';

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

/** A light with no element of its own (a blob of a background): where it is on the screen, and how it shines. */
export interface LenziSourceLamp {
  left: number;
  top: number;
  right: number;
  bottom: number;
  /** Any CSS colour. */
  color: string;
  strength: number;
  reach: number;
}

/** The most lamps that light one surface at once (the nearest). */
export const MOST_LAMPS = 6;

/** How long a lamp takes to switch on or off, seconds (none with reduced motion). */
const FADE = 0.16;

/** How much of its own light a lamp lays over what it holds (a toggle's chosen segment, a list's rows). */
const OWN_LIGHT = 0.3;

/** How far a shadow goes, px: past the edge of any screen. */
const SHADOW_LENGTH = 4000;

/** How often the lamps' colours are read again (the theme may change), ms. */
const COLOURS_EVERY = 500;

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

/** A light this frame, wherever it comes from. */
interface Shining {
  element: HTMLElement | null;
  box: Box;
  color: string;
  strength: number;
  reach: number;
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** A CSS variable as its `var()`, any other colour as it is. */
export const cssColor = (color: string): string => (color.trim().startsWith('--') ? `var(${color.trim()})` : color.trim());

/**
 * The light that glowing elements (`lenziGlow`) and glowing backgrounds' objects shed on the elements
 * around them, on the same plane as them (lenzi, 2026-11-14: "a lit surface and projects light directly
 * onto the others component ... this elements must act on the same plain as the other elements unlike the
 * background", "ovviamente la luce di tutti i colori"), and the shadows of the solid ones (`lenziSolid`:
 * "a faint hard shadow ... for if a solid component is interacting with light").
 *
 * Every frame while a light is on, it measures where the lamps, the surfaces (`lenziLit`, `lenziSolid`)
 * and the solid elements are, and gives each surface the light of the lamps that reach it: from the side
 * that faces each lamp, in the lamp's colour, brighter the nearer it is; the lights add up; where a solid
 * element stands between a lamp and a surface, a hard shadow takes part of that lamp's light away. The
 * surface shows it over everything it holds (its `::before`, and its border in `::after`): drawn by a
 * paint worklet (`paint(lenzi-light)`, from `--lenzi-light-data`) where the browser has one, by CSS
 * gradients without shadows elsewhere. Nothing runs while no light is on; a frame where nothing moved
 * writes nothing.
 */
@Injectable({
  providedIn: 'root',
})
export class LenziLightField {
  private readonly document = inject(DOCUMENT);
  private readonly lamps = new Map<HTMLElement, LampEntry>();
  private readonly sources = new Map<object, readonly LenziSourceLamp[]>();
  private readonly surfaces = new Map<HTMLElement, SurfaceEntry>();
  private readonly casters = new Set<HTMLElement>();
  private readonly colours = new Map<string, [number, number, number]>();
  private coloursRead = 0;
  private probe: HTMLElement | null = null;
  private frame: number | null = null;
  private last = 0;

  constructor() {
    this.paintWorklet();
  }

  /** A lamp (`lenziGlow`): `read` says how it shines now. Gives back how to take it away. */
  addLamp(element: HTMLElement, read: () => LenziLamp): () => void {
    this.lamps.set(element, { element, read, level: 0 });
    this.wake();
    return () => {
      this.lamps.delete(element);
      this.wake();
    };
  }

  /** The lights of a source with no elements (a background's blobs), now; an empty list takes them away. */
  setSourceLamps(source: object, lamps: readonly LenziSourceLamp[]): void {
    if (lamps.length) this.sources.set(source, lamps);
    else if (!this.sources.delete(source)) return;
    this.wake();
  }

  /** A surface that takes the light (`lenziLit`, `lenziSolid`). Gives back how to take it away. */
  addSurface(element: HTMLElement): () => void {
    this.surfaces.set(element, { element, written: '' });
    this.wake();
    return () => {
      const surface = this.surfaces.get(element);
      if (surface) this.write(surface, '', '', '');
      this.surfaces.delete(element);
    };
  }

  /** An element that stops the light (`lenziSolid`): it casts a shadow. Gives back how to take it away. */
  addCaster(element: HTMLElement): () => void {
    this.casters.add(element);
    this.wake();
    return () => {
      this.casters.delete(element);
      this.wake();
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
    const now = view?.performance.now() ?? 0;
    if (now - this.coloursRead > COLOURS_EVERY) {
      this.coloursRead = now;
      this.colours.clear();
    }

    // first every measure, then every write: the page is laid out once a frame
    const shining: Shining[] = [];
    let moving = false;
    for (const entry of this.lamps.values()) {
      const lamp = entry.read();
      const target = lamp.on ? 1 : 0;
      entry.level += (target - entry.level) * step;
      if (Math.abs(target - entry.level) < 0.004) entry.level = target;
      else moving = true;
      const strength = Math.min(2, Math.max(0, lamp.strength)) * entry.level;
      if (strength > 0 && lamp.reach > 0) shining.push({ element: entry.element, box: entry.element.getBoundingClientRect(), color: lamp.color, strength, reach: lamp.reach });
    }
    for (const lamps of this.sources.values()) {
      for (const lamp of lamps) if (lamp.strength > 0 && lamp.reach > 0) shining.push({ element: null, box: lamp, color: lamp.color, strength: Math.min(2, lamp.strength), reach: lamp.reach });
    }
    const casters = [...this.casters].map((element) => ({ element, box: element.getBoundingClientRect() as Box }));
    const boxes = [...this.surfaces.values()].map((surface) => ({ surface, box: surface.element.getBoundingClientRect() as Box }));

    for (const { surface, box } of boxes) {
      const reaching = shining
        .filter((light) => light.element !== surface.element)
        .map((light) => ({ light, distance: gap(box, light.box) }))
        .filter(({ light, distance }) => distance < light.reach)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, MOST_LAMPS)
        .map(({ light }) => light);
      const own = shining.find((light) => light.element === surface.element);
      if (reaching.length === 0 && !own) {
        this.write(surface, '', '', '');
        continue;
      }
      const centre = { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
      const data: unknown[] = [];
      const gradients = (amount: string) => {
        const list = reaching.map((light) => {
          const x = clamp(centre.x, light.box.left, light.box.right) - box.left;
          const y = clamp(centre.y, light.box.top, light.box.bottom) - box.top;
          const at = (share: number) => mix(light.color, amount, light.strength * share);
          return `radial-gradient(circle ${Math.round(light.reach)}px at ${Math.round(x)}px ${Math.round(y)}px, ${at(1)}, ${at(0.82)} 15%, ${at(0.5)} 38%, ${at(0.2)} 68%, transparent)`;
        });
        if (own) {
          const tint = mix(own.color, amount, own.strength * OWN_LIGHT);
          list.push(`linear-gradient(${tint}, ${tint})`);
        }
        return list.join(', ');
      };
      for (const light of reaching) {
        // the light comes from the lamp's side that faces this surface
        const x = clamp(centre.x, light.box.left, light.box.right) - box.left;
        const y = clamp(centre.y, light.box.top, light.box.bottom) - box.top;
        // a shadow is cast from the lamp's middle
        const from = { x: (light.box.left + light.box.right) / 2, y: (light.box.top + light.box.bottom) / 2 };
        const shadows = casters
          .filter((caster) => caster.element !== surface.element && caster.element !== light.element && !inside(from, caster.box))
          .map((caster) => shadowOf(caster.box, from).map((value, index) => Math.round(value - (index % 2 === 0 ? box.left : box.top))));
        data.push([Math.round(x), Math.round(y), Math.round(light.reach), ...this.rgb(light.color), round(light.strength), shadows]);
      }
      if (own) data.push([0, 0, -1, ...this.rgb(own.color), round(own.strength * OWN_LIGHT)]);
      this.write(surface, gradients('--lenzi-glow-veil'), gradients('--lenzi-glow-rim'), `'${JSON.stringify(data)}'`);
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
    else for (const surface of this.surfaces.values()) this.write(surface, '', '', '');
  }

  private write(surface: SurfaceEntry, veil: string, rim: string, data: string): void {
    const written = `${veil}|${rim}|${data}`;
    if (written === surface.written) return;
    surface.written = written;
    const style = surface.element.style;
    if (veil) {
      style.setProperty('--lenzi-lamps-veil', veil);
      style.setProperty('--lenzi-lamps-rim', rim);
      style.setProperty('--lenzi-light-data', data);
    } else {
      for (const name of ['--lenzi-lamps-veil', '--lenzi-lamps-rim', '--lenzi-light-data']) style.removeProperty(name);
    }
  }

  /** A CSS colour as r, g, b (0..255), as the browser resolves it (variables too); read again now and then. */
  private rgb(color: string): [number, number, number] {
    const known = this.colours.get(color);
    if (known) return known;
    let rgb: [number, number, number] = [255, 255, 255];
    const view = this.document.defaultView;
    if (view && this.document.body) {
      if (!this.probe) {
        this.probe = this.document.createElement('span');
        this.probe.style.display = 'none';
        this.document.body.append(this.probe);
      }
      this.probe.style.color = '';
      this.probe.style.color = cssColor(color);
      const match = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(view.getComputedStyle(this.probe).color);
      if (match) rgb = [Math.round(+match[1]!), Math.round(+match[2]!), Math.round(+match[3]!)];
    }
    this.colours.set(color, rgb);
    return rgb;
  }

  /** The paint worklet, where the browser has them; then the styles use it (`:root.lenzi-paint-light`). */
  private paintWorklet(): void {
    const view = this.document.defaultView as (Window & { CSS?: { paintWorklet?: { addModule(url: string): Promise<void> } }; URL?: typeof URL }) | null;
    const worklet = view?.CSS?.paintWorklet;
    if (!worklet || typeof Blob === 'undefined' || !view?.URL?.createObjectURL) return;
    const url = view.URL.createObjectURL(new Blob([LIGHT_WORKLET], { type: 'text/javascript' }));
    worklet
      .addModule(url)
      .then(() => this.document.documentElement.classList.add('lenzi-paint-light'))
      .catch(() => undefined);
  }
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const round = (value: number) => Math.round(value * 1000) / 1000;
const inside = (point: { x: number; y: number }, box: Box) => point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom;

/**
 * The lamp's colour, `share` of it (1: as much as the variable `amount` says), the rest transparent: the
 * global variable is read by the browser, so changing it changes every light at once.
 */
function mix(color: string, amount: string, share: number): string {
  return `color-mix(in srgb, ${cssColor(color)} min(100%, calc(var(${amount}) * ${round(share)})), transparent)`;
}

/** How far apart two boxes are, px (0 when they touch or overlap). */
function gap(a: Box, b: Box): number {
  const dx = Math.max(0, b.left - a.right, a.left - b.right);
  const dy = Math.max(0, b.top - a.bottom, a.top - b.bottom);
  return Math.hypot(dx, dy);
}

/**
 * The shadow a box casts from a point of light: the box and everything behind it as seen from the light,
 * as a polygon (x, y, x, y, …; screen px), counter-clockwise: the hull of its corners and of the corners
 * carried far away from the light.
 */
export function shadowOf(box: Box, light: { x: number; y: number }): number[] {
  const corners = [
    [box.left, box.top],
    [box.right, box.top],
    [box.right, box.bottom],
    [box.left, box.bottom],
  ] as [number, number][];
  const far = corners.map(([x, y]) => {
    const dx = x - light.x;
    const dy = y - light.y;
    const length = Math.hypot(dx, dy) || 1;
    return [x + (dx / length) * SHADOW_LENGTH, y + (dy / length) * SHADOW_LENGTH] as [number, number];
  });
  return hull([...corners, ...far]).flat();
}

/** The convex hull of points (Andrew's monotone chain), counter-clockwise on the screen. */
function hull(points: [number, number][]): [number, number][] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: [number, number][]) => {
    const chain: [number, number][] = [];
    for (const point of list) {
      while (chain.length >= 2 && cross(chain[chain.length - 2]!, chain[chain.length - 1]!, point) <= 0) chain.pop();
      chain.push(point);
    }
    chain.pop();
    return chain;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

import { DOCUMENT, Injectable, inject } from '@angular/core';

import { LIGHT_STOPS, LIGHT_WORKLET } from './light-worklet';

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

/** An outline: points as fractions of an element's box (0, 0 its top left; 1, 1 its bottom right). */
export type LenziOutline = readonly (readonly [number, number])[];

/** The most lamps that light one surface at once (the nearest). */
export const MOST_LAMPS = 6;

/** How long a lamp takes to switch on or off, seconds (none with reduced motion). */
const FADE = 0.16;

/** How much of its own light a lamp lays over what it holds (a toggle's chosen segment, a list's rows). */
const OWN_LIGHT = 0.3;

/** How far a shadow goes, px: past the edge of any screen. */
const SHADOW_LENGTH = 4000;

/** How many pieces a rounded corner of a shadow is made of. */
const ARC_STEPS = 6;

/** How often the lamps' colours and the solid elements' corners are read again (the theme may change), ms. */
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
  /** Where its light layer starts, from its box's top left, px; read now and then (null: read it). */
  origin: { x: number; y: number } | null;
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

/**
 * Makes room for the light on a surface's border (`lenziLit`, `lenziSolid` call it once). A surface that
 * cuts what leaves it (`overflow: hidden`, a toggle group) would cut the light on its border, and a line of
 * light inside the border looks like a second outline (lenzi, 2026-11-14: "has a double outline now"): it
 * cuts at its border's outer edge instead (`.lenzi-lit-clipped`: `overflow: clip`, the same for what it
 * holds). A surface that scrolls cannot: the light stays inside it, with no line (`.lenzi-lit-scrolls`), and it
 * stays over what shows: it moves as far as the surface has scrolled (`--lenzi-lit-scroll-x`, `-y`; lenzi,
 * 2026-11-17: the scene maker's panels, scrolled, showed their light as a box ending halfway down). Gives back
 * what stops that.
 */
export function fitLight(surface: HTMLElement): () => void {
  const style = surface.ownerDocument.defaultView?.getComputedStyle(surface);
  if (!style) return () => undefined;
  const overflow = [style.overflowX, style.overflowY];
  const scrolls = overflow.some((value) => value === 'auto' || value === 'scroll');
  surface.classList.toggle('lenzi-lit-scrolls', scrolls);
  surface.classList.toggle('lenzi-lit-clipped', !scrolls && overflow.includes('hidden'));
  if (!scrolls) return () => undefined;
  const follow = () => {
    surface.style.setProperty('--lenzi-lit-scroll-x', `${surface.scrollLeft}px`);
    surface.style.setProperty('--lenzi-lit-scroll-y', `${surface.scrollTop}px`);
  };
  follow();
  surface.addEventListener('scroll', follow, { passive: true });
  return () => surface.removeEventListener('scroll', follow);
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
 * and the solid elements are, and gives each surface the light of the lamps that reach it: centred on each
 * lamp, fading with the distance from its outline, in its colour; the lights add up; where a solid
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
  private readonly casters = new Map<HTMLElement, () => LenziOutline | null>();
  /** Each solid element's corner radius, px, read now and then. */
  private readonly radii = new Map<HTMLElement, number>();
  /** Whether each solid element's corners are squircles, read with its radius. */
  private readonly squircles = new Map<HTMLElement, boolean>();
  private readonly colours = new Map<string, [number, number, number]>();
  private coloursRead = 0;
  private probe: HTMLElement | null = null;
  /** A canvas of one pixel that turns any colour into sRGB (undefined: not made yet; null: none here). */
  private pixel: CanvasRenderingContext2D | null | undefined = undefined;
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
    this.surfaces.set(element, { element, written: '', origin: null });
    this.wake();
    return () => {
      const surface = this.surfaces.get(element);
      if (surface) this.write(surface, '', '', '');
      this.surfaces.delete(element);
    };
  }

  /**
   * An element that stops the light (`lenziSolid`): it casts a shadow, of its box with its rounded corners,
   * or of `outline` (a polygon, points as fractions of its box, 0..1: a drawing that is not a box, a cat;
   * hollows are kept), read at every frame. Gives back how to take it away.
   */
  addCaster(element: HTMLElement, outline?: () => LenziOutline | null): () => void {
    this.casters.set(element, outline ?? (() => null));
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
      this.radii.clear();
      this.squircles.clear();
      for (const surface of this.surfaces.values()) surface.origin = null;
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
    const casters = [...this.casters].map(([element, outline]) => {
      const box = element.getBoundingClientRect() as Box;
      const points = outline();
      return { element, box, radius: this.radius(element), squircle: this.squircle(element), outline: points?.length ? onScreen(points, box) : null };
    });
    const boxes = [...this.surfaces.values()].map((surface) => ({ surface, origin: this.origin(surface), outer: surface.element.getBoundingClientRect() as Box }));

    for (const { surface, origin, outer } of boxes) {
      // the light is drawn from where the surface's light layer starts (its border box, or inside its
      // border where it cuts what leaves it)
      const box: Box = { left: outer.left + origin.x, top: outer.top + origin.y, right: outer.right - origin.x, bottom: outer.bottom - origin.y };
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
      const data: unknown[] = [];
      const gradients = (amount: string) => {
        const list = reaching.map((light) => {
          // centred on the lamp (2026-11-14: "they're generally uncentered"): an ellipse round its box, full
          // over it, fading `reach` px off it (the worklet fades off its outline exactly)
          const half = { x: (light.box.right - light.box.left) / 2, y: (light.box.bottom - light.box.top) / 2 };
          const x = light.box.left + half.x - box.left;
          const y = light.box.top + half.y - box.top;
          const radius = { x: half.x + light.reach, y: half.y + light.reach };
          const inner = (half.x / radius.x + half.y / radius.y) / 2;
          const stop = (share: number) => `${Math.round((inner + (1 - inner) * share) * 1000) / 10}%`;
          const at = (share: number) => mix(light.color, amount, light.strength * share);
          const fade = LIGHT_STOPS.map(([where, share]) => (share === 0 ? 'transparent' : `${at(share)} ${stop(where)}`));
          return `radial-gradient(ellipse ${Math.round(radius.x)}px ${Math.round(radius.y)}px at ${Math.round(x)}px ${Math.round(y)}px, ${fade.join(', ')})`;
        });
        if (own) {
          const tint = mix(own.color, amount, own.strength * OWN_LIGHT);
          list.push(`linear-gradient(${tint}, ${tint})`);
        }
        return list.join(', ');
      };
      for (const light of reaching) {
        // a shadow is cast from the lamp's middle
        const from = { x: (light.box.left + light.box.right) / 2, y: (light.box.top + light.box.bottom) / 2 };
        const shadows = casters
          // a shadow falls only on what lies under the element (lenzi, 2026-11-14: "The one on the bottom
          // shouldn't be able to cast to the one on top")
          .filter((caster) => caster.element !== surface.element && caster.element !== light.element && !inside(from, caster.box) && above(caster.element, surface.element))
          .flatMap((caster) => (caster.outline ? shadowsOfOutline(caster.outline, from) : [shadowOf(caster.box, from, caster.radius, caster.squircle)]))
          .map((polygon) => polygon.map((value, index) => Math.round(value - (index % 2 === 0 ? box.left : box.top))));
        // the lamp's box in the surface's px: its light fades off its outline, all round it
        const lampBox = [light.box.left - box.left, light.box.top - box.top, light.box.right - box.left, light.box.bottom - box.top].map(Math.round);
        data.push([...lampBox, Math.round(light.reach), ...this.rgb(light.color), round(light.strength), shadows]);
      }
      if (own) data.push([0, 0, 0, 0, -1, ...this.rgb(own.color), round(own.strength * OWN_LIGHT)]);
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

  /**
   * Where a surface's light layer starts, from its box's top left: over its border (it covers it exactly:
   * `--lenzi-light-inset` is its own border, not the kit's, so a floor with none is not off by 2 px), or
   * inside the border where the surface cuts what leaves it. Read now and then.
   */
  private origin(surface: SurfaceEntry): { x: number; y: number } {
    if (surface.origin) return surface.origin;
    const style = this.document.defaultView?.getComputedStyle(surface.element);
    if (!style) return (surface.origin = { x: 0, y: 0 });
    // only a surface that scrolls keeps its light inside its border (fitLight)
    const clipped = surface.element.classList.contains('lenzi-lit-scrolls');
    const sides = [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth].map((width) => parseFloat(width) || 0);
    const inset = clipped ? '0px' : sides.map((width) => `${-width}px`).join(' ');
    if (surface.element.style.getPropertyValue('--lenzi-light-inset') !== inset) surface.element.style.setProperty('--lenzi-light-inset', inset);
    return (surface.origin = clipped ? { x: sides[3]!, y: sides[0]! } : { x: 0, y: 0 });
  }

  /** A solid element's corner radius, px (its top left one: the kit rounds every corner alike). */
  private radius(element: HTMLElement): number {
    let radius = this.radii.get(element);
    if (radius === undefined) {
      radius = parseFloat(this.document.defaultView?.getComputedStyle(element).borderTopLeftRadius ?? '') || 0;
      this.radii.set(element, radius);
    }
    return radius;
  }

  /** Whether a solid element's corners are squircles (`--lenzi-corner-shape`), read with its radius. */
  private squircle(element: HTMLElement): boolean {
    let squircle = this.squircles.get(element);
    if (squircle === undefined) {
      const style = this.document.defaultView?.getComputedStyle(element);
      const shape = style?.getPropertyValue('corner-top-left-shape') || style?.getPropertyValue('corner-shape') || '';
      squircle = /squircle|superellipse\(\s*2\s*\)/.test(shape);
      this.squircles.set(element, squircle);
    }
    return squircle;
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
      const computed = view.getComputedStyle(this.probe).color;
      const match = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(computed);
      if (match) rgb = [Math.round(+match[1]!), Math.round(+match[2]!), Math.round(+match[3]!)];
      else {
        // another space (oklch, color(), a relative colour: a lamp whose hue drifts; 2026-11-14, "the light
        // emitted by the cat is always white"): a canvas turns it into sRGB
        const painted = this.paint(computed);
        if (painted) rgb = painted;
      }
    }
    this.colours.set(color, rgb);
    return rgb;
  }

  /** A CSS colour in any space as sRGB 0..255, painted on a canvas of one pixel; null where there is no canvas. */
  private paint(css: string): [number, number, number] | null {
    if (this.pixel === undefined) {
      try {
        const canvas = this.document.createElement('canvas');
        canvas.width = canvas.height = 1;
        this.pixel = canvas.getContext('2d', { willReadFrequently: true });
      } catch {
        this.pixel = null;
      }
    }
    const context = this.pixel;
    if (!context) return null;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = '#fff';
    context.fillStyle = css;
    context.fillRect(0, 0, 1, 1);
    const [r = 255, g = 255, b = 255] = context.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
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

const round = (value: number) => Math.round(value * 1000) / 1000;
const inside = (point: { x: number; y: number }, box: Box) => point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom;

/**
 * The lamp's colour, `share` of it (1: as much as the variable `amount` says), the rest transparent: the
 * global variable is read by the browser, so changing it changes every light at once.
 */
function mix(color: string, amount: string, share: number): string {
  return `color-mix(in srgb, ${cssColor(color)} min(100%, calc(var(${amount}) * ${round(share)})), transparent)`;
}

/**
 * Whether `a` is drawn above `b`: what an element holds is above it; otherwise, of the two branches of their
 * nearest common ancestor, the one with the higher z-index, and at the same z-index the later one.
 */
export function above(a: Element, b: Element): boolean {
  if (a === b) return false;
  if (b.contains(a)) return true;
  if (a.contains(b)) return false;
  // the branches of a and b under their nearest common ancestor
  const branch = (element: Element, under: Element) => {
    let current = element;
    while (current.parentElement && current.parentElement !== under) current = current.parentElement;
    return current;
  };
  let common = a.parentElement;
  while (common && !common.contains(b)) common = common.parentElement;
  if (!common) return false;
  const one = branch(a, common);
  const other = branch(b, common);
  const z = (element: Element) => {
    const style = element.ownerDocument.defaultView?.getComputedStyle(element);
    const value = style && style.position !== 'static' ? parseInt(style.zIndex, 10) : NaN;
    return Number.isFinite(value) ? value : 0;
  };
  const zOne = z(one);
  const zOther = z(other);
  if (zOne !== zOther) return zOne > zOther;
  return (other.compareDocumentPosition(one) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
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
export function shadowOf(box: Box, light: { x: number; y: number }, radius = 0, squircle = false): number[] {
  // the element's own outline: its corners rounded as its border-radius (2026-11-14: a square shadow
  // stuck out of a rounded card's corners), as a circle's arc or as a squircle's (CSS corner-shape: the
  // superellipse x⁴ + y⁴ = r⁴ round the same centre)
  const r = Math.max(0, Math.min(radius, (box.right - box.left) / 2, (box.bottom - box.top) / 2));
  const corners: [number, number][] = [];
  const bend = (value: number) => (squircle ? Math.sign(value) * Math.sqrt(Math.abs(value)) : value);
  const arc = (cx: number, cy: number, from: number) => {
    for (let step = 0; step <= ARC_STEPS; step++) {
      const angle = from + (step / ARC_STEPS) * (Math.PI / 2);
      corners.push([cx + bend(Math.cos(angle)) * r, cy + bend(Math.sin(angle)) * r]);
    }
  };
  if (r === 0) {
    corners.push([box.left, box.top], [box.right, box.top], [box.right, box.bottom], [box.left, box.bottom]);
  } else {
    arc(box.left + r, box.top + r, Math.PI);
    arc(box.right - r, box.top + r, -Math.PI / 2);
    arc(box.right - r, box.bottom - r, 0);
    arc(box.left + r, box.bottom - r, Math.PI / 2);
  }
  return shadowOfOutline(corners, light);
}

/**
 * The shadow of any outline (screen px) from a point of light: the hull of its points and of the same
 * points carried far away from the light. A concave outline casts the shadow of its hull, which from a
 * point of light is the same but for its hollows.
 */
export function shadowOfOutline(points: readonly (readonly [number, number])[], light: { x: number; y: number }): number[] {
  const near = points.map(([x, y]) => [x, y] as [number, number]);
  const far = near.map(([x, y]) => {
    const dx = x - light.x;
    const dy = y - light.y;
    const length = Math.hypot(dx, dy) || 1;
    return [x + (dx / length) * SHADOW_LENGTH, y + (dy / length) * SHADOW_LENGTH] as [number, number];
  });
  return hull([...near, ...far]).flat();
}

/**
 * The shadow of a drawing's outline (screen px, any shape, hollows too) from a point of light, as polygons
 * whose union it is: the drawing itself, and each side that faces the light carried far away from it. So
 * the shadow keeps the drawing's shape (lenzi, 2026-11-14, of a cat's shadow drawn from its hull: "Not
 * quite"): the gap between its ears, the curve of its tail.
 */
export function shadowsOfOutline(points: readonly (readonly [number, number])[], light: { x: number; y: number }): number[][] {
  const count = points.length;
  let area = 0;
  for (let i = 0; i < count; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[(i + 1) % count]!;
    area += x0 * y1 - x1 * y0;
  }
  const far = ([x, y]: readonly [number, number]) => {
    const dx = x - light.x;
    const dy = y - light.y;
    const length = Math.hypot(dx, dy) || 1;
    return [x + (dx / length) * SHADOW_LENGTH, y + (dy / length) * SHADOW_LENGTH];
  };
  const polygons: number[][] = [points.flat()];
  for (let i = 0; i < count; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % count]!;
    // a side faces the light when the light is on its outer side
    const side = (b[0] - a[0]) * (light.y - a[1]) - (b[1] - a[1]) * (light.x - a[0]);
    if (side * area < 0) polygons.push([...a, ...b, ...far(b), ...far(a)]);
  }
  // all turning the same way, so where they overlap (nonzero) they add up instead of cancelling out
  return polygons.map(clockwise);
}

/** A flat polygon (x, y, …) turning the same way as every other one. */
function clockwise(polygon: number[]): number[] {
  let area = 0;
  const count = polygon.length / 2;
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    area += polygon[i * 2]! * polygon[j * 2 + 1]! - polygon[j * 2]! * polygon[i * 2 + 1]!;
  }
  if (area >= 0) return polygon;
  const reversed: number[] = [];
  for (let i = count - 1; i >= 0; i--) reversed.push(polygon[i * 2]!, polygon[i * 2 + 1]!);
  return reversed;
}

/** An outline given as fractions of a box, on the screen. */
function onScreen(points: LenziOutline, box: Box): [number, number][] {
  const width = box.right - box.left;
  const height = box.bottom - box.top;
  return points.map(([x, y]) => [box.left + x * width, box.top + y * height]);
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

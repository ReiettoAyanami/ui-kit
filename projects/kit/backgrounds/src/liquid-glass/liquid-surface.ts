// The Liquid Glass of one element, as a plain object: its filter drawn for its size and corners, the rim lit by
// the boids near it. `lenziLiquidGlass` makes one for its element; `provideLenziLiquidGlass()` one for every surface
// of the app (2026-11-25). A plain module (no schematic makes one).
import { LenziSights } from '../sights/sights';
import { LenziGlassSurface, RIM_ANGLES, liquidGlassMaps, liquidGlassOutlineMaps } from './liquid-glass-maps';

const SVG = 'http://www.w3.org/2000/svg';
/** How many frames apart the glass looks at its corners again (about half a second). */
const RADIUS_FRAMES = 30;
let made = 0;

/** How the glass bends and shines (the directive's inputs). */
export interface LenziLiquidGlassSettings {
  bezel: number;
  thickness: number;
  ior: number;
  refraction: number;
  surface: LenziGlassSurface;
  blur: number;
  saturation: number;
  /** How much of the white highlight lies on the edge, 0 to 1 (kube.io's "specular opacity"). */
  specularOpacity: number;
  /** How saturated the copy of what is behind is, on the edge (kube.io's "specular saturation"): the edge takes its colour. */
  specularSaturation: number;
  rim: number;
  lightAngle: number;
  rimBoids: number;
  /** How far from the glass the pointer lights its rim, px (0: never); on the side it comes from, brighter nearer. */
  pointerReach: number;
  glassPath: string | null;
  glassViewBox: string;
}

export const LIQUID_GLASS_SETTINGS: LenziLiquidGlassSettings = {
  bezel: 28,
  thickness: 56,
  ior: 1.5,
  refraction: 1,
  surface: 'squircle',
  blur: 0.2,
  saturation: 1,
  specularOpacity: 0.5,
  specularSaturation: 6,
  rim: 0.5,
  lightAngle: -60,
  rimBoids: 60,
  pointerReach: 160,
  glassPath: null,
  glassViewBox: '0 0 100 100',
};

/** Where the pointer is on a page (one listener a document, for every glass); `on`: over the page. */
const pointers = new WeakMap<Document, { x: number; y: number; on: boolean; down: boolean }>();
function pointerOf(document: Document): { x: number; y: number; on: boolean; down: boolean } {
  let pointer = pointers.get(document);
  if (!pointer) {
    const tracked = { x: 0, y: 0, on: false, down: false };
    pointer = tracked;
    pointers.set(document, tracked);
    const at = (event: PointerEvent) => Object.assign(tracked, { x: event.clientX, y: event.clientY, on: true });
    document.addEventListener('pointermove', at, { passive: true });
    document.addEventListener('pointerdown', (event) => (at(event), (tracked.down = true)), { passive: true, capture: true });
    for (const end of ['pointerup', 'pointercancel'] as const) document.addEventListener(end, () => (tracked.down = false), { passive: true, capture: true });
    document.documentElement.addEventListener('pointerleave', () => Object.assign(tracked, { on: false, down: false }));
  }
  return pointer;
}

/** Whether this browser draws an SVG filter as a backdrop-filter (only Chromium does). */
export function refracts(view: Window | null): boolean {
  const brands = (view?.navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } } | undefined)?.userAgentData?.brands;
  return !!brands?.some((brand) => /Chromium/i.test(brand.brand));
}

/**
 * One element's Liquid Glass. `build()` draws its filter for its size now (nothing when nothing it is made of
 * changed); `light()` at every frame lights its rim and, now and then, looks at its corners; `destroy()` takes it
 * away. It never runs a frame or watches a size by itself: who made it does.
 */
export class LenziLiquidSurface {
  private readonly id = `lenzi-liquid-glass-${++made}`;
  private svg: SVGSVGElement | null = null;
  private size = '';
  /** The share of its bending it shows (`bending()`), and the whole of it, px. */
  private bend = 1;
  private fullBend = 0;
  /** The corners' radius the filter was drawn for, px; and the frames since it was last looked at. */
  private radius = 0;
  private framesSinceRadius = 0;
  /** The rim pictures (data URLs) by side, the last from all round; which is shown, and how bright. */
  private rims: string[] = [];
  private shownRim = -1;
  private shownSlope = '';

  constructor(
    readonly element: HTMLElement,
    private readonly document: Document,
    private readonly sights: LenziSights,
    private readonly settings: () => LenziLiquidGlassSettings,
  ) {}

  /** The filter for the glass's size now: its maps drawn, its SVG in the page, then the glass pointed at it. */
  build(): void {
    const s = this.settings();
    // its own size, not its box on the screen: a glass that is scaled by an animation keeps the maps of its size
    const box = this.element.getBoundingClientRect();
    const width = Math.round(this.element.offsetWidth || box.width);
    const height = Math.round(this.element.offsetHeight || box.height);
    if (width < 2 || height < 2) return;
    const radius = this.cornerRadius();
    this.radius = radius;
    const path = s.glassPath;
    const key = `${width}x${height}|${radius}|${s.bezel}|${s.thickness}|${s.ior}|${s.surface}|${s.lightAngle}|${s.refraction}|${s.blur}|${s.saturation}|${s.specularOpacity}|${s.specularSaturation}|${s.rim}|${s.glassViewBox}|${path ?? ''}`;
    if (key === this.size) return;
    this.size = key;
    // A bezel wider than half the glass would bend the whole of it: never more than a third of its smaller side.
    const bezel = Math.min(s.bezel, Math.max(4, Math.min(width, height) / 3));
    const optics = { bezel, thickness: s.thickness, ior: s.ior, surface: s.surface, lightAngle: s.lightAngle };
    const inside = path ? this.outline(path, width, height) : null;
    const maps = inside ? liquidGlassOutlineMaps({ width, height, inside, ...optics }) : liquidGlassMaps({ width, height, radius, ...optics });
    const picture = (data: Uint8ClampedArray): string => {
      const canvas = this.document.createElement('canvas');
      canvas.width = maps.width;
      canvas.height = maps.height;
      canvas.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(data), maps.width, maps.height), 0, 0);
      return canvas.toDataURL();
    };
    this.rims = maps.rims.map((rim) => picture(rim.data));
    this.shownRim = this.rims.length - 1;
    this.shownSlope = '';
    const svg = this.svg ?? (this.document.createElementNS(SVG, 'svg') as SVGSVGElement);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('color-interpolation-filters', 'sRGB');
    svg.style.position = 'absolute';
    svg.style.pointerEvents = 'none';
    const scale = (maps.scale * Math.max(0, s.refraction)).toFixed(2);
    this.fullBend = Number(scale);
    const saturation = Math.max(0, s.saturation);
    // kube.io's chain (lenzi, 2026-11-25: "guarda come i bordi prendono il colore di quello che sta sotto"): what is behind,
    // softened and bent; on the edge a much more saturated copy of it, where the specular map says (so the edge takes the
    // colour of what is under it), and a white highlight over that at `specularOpacity`; then the moving light (rims).
    svg.innerHTML = `<filter id="${this.id}" x="0" y="0" width="${width}" height="${height}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse">
  <feGaussianBlur in="SourceGraphic" stdDeviation="${Math.max(0, s.blur)}" result="soft"/>
  <feImage href="${picture(maps.displacement)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="map"/>
  <feDisplacementMap class="lenzi-liquid-glass-bend" in="soft" in2="map" scale="${(Number(scale) * this.bend).toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="bent"/>
  <feColorMatrix in="bent" type="saturate" values="${saturation}" result="refracted"/>
  <feColorMatrix in="bent" type="saturate" values="${Math.max(0, s.specularSaturation)}" result="vivid"/>
  <feImage href="${picture(maps.specular)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="specular"/>
  <feComposite in="vivid" in2="specular" operator="in" result="edge"/>
  <feComponentTransfer in="specular" result="highlight"><feFuncA type="linear" slope="${Math.max(0, s.specularOpacity)}"/></feComponentTransfer>
  <feBlend in="edge" in2="refracted" mode="normal" result="coloured"/>
  <feBlend in="highlight" in2="coloured" mode="normal" result="glass"/>
  <feImage class="lenzi-liquid-glass-rim" href="${this.rims[this.rims.length - 1]}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="light"/>
  <feComponentTransfer in="light" result="rim"><feFuncA class="lenzi-liquid-glass-rim-light" type="linear" slope="0"/></feComponentTransfer>
  <feBlend in="rim" in2="glass" mode="screen"/>
</filter>`;
    // the filter in the page before the glass points at it (pointed at first, Chromium shows nothing)
    if (!this.svg) {
      this.document.body.append(svg);
      this.svg = svg;
    }
    this.element.style.setProperty('backdrop-filter', `url(#${this.id})`);
  }

  /**
   * How much of its bending the glass shows now, 0 to 1 (kube.io's switch: 0.4 at rest, 0.9 while held): changes the
   * filter's scale only, the maps stay.
   */
  bending(share: number): void {
    this.bend = Math.max(0, share);
    this.svg?.querySelector('.lenzi-liquid-glass-bend')?.setAttribute('scale', (this.fullBend * this.bend).toFixed(2));
  }

  /** Draws the filter again at the next build, even for the same size (a setting changed). */
  invalidate(): void {
    this.size = '';
  }

  /**
   * The rim now: as bright as the boids near the glass are many (none: dark), from the side they are on, all round
   * once their middle is under the glass. Says whether the corners changed (the filter must be drawn again).
   */
  light(): boolean {
    const svg = this.svg;
    if (!svg || this.rims.length === 0) return false;
    // its corners, about twice a second: changed by the app's CSS (a class, a variable), the filter is drawn again for
    // them (lenzi, 2026-11-21: "tanti input non si aggiornano automaticamente")
    let cornersChanged = false;
    if (++this.framesSinceRadius >= RADIUS_FRAMES) {
      this.framesSinceRadius = 0;
      cornersChanged = this.cornerRadius() !== this.radius;
    }
    const s = this.settings();
    const box = this.element.getBoundingClientRect();
    const middle = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    // What lights the rim: the boids of a flock behind (as many as `rimBoids`: whole), or the pointer near the glass
    // (lenzi, 2026-11-25: "Controlla che i bordi dinamici lo siano veramente": with no flock, the rims never moved).
    const crowd = this.sights.around(middle, Math.max(box.width, box.height) * 0.8);
    const byBoids = crowd ? Math.max(0, s.rim) * Math.min(1, crowd.count / Math.max(1, s.rimBoids)) : 0;
    const pointer = pointerOf(this.document);
    let byPointer = 0;
    if (pointer.on && s.pointerReach > 0) {
      const away = Math.hypot(Math.max(box.left - pointer.x, 0, pointer.x - box.right), Math.max(box.top - pointer.y, 0, pointer.y - box.bottom));
      byPointer = Math.max(0, s.rim) * Math.pow(Math.max(0, 1 - away / s.pointerReach), 2);
    }
    // Pressed: the whole rim lights up, brighter (Apple: glass "reacts to touch and pointer interactions in real time").
    const pressed =
      pointer.on && pointer.down && pointer.x >= box.left && pointer.x <= box.right && pointer.y >= box.top && pointer.y <= box.bottom;
    const from = byPointer > byBoids ? pointer : crowd;
    const bright = pressed ? Math.min(1, Math.max(0, s.rim) * 2) : Math.max(byBoids, byPointer);
    let side = this.rims.length - 1;
    if (from && bright > 0 && !pressed) {
      const ox = (from.x - middle.x) / Math.max(1, box.width / 2);
      const oy = (from.y - middle.y) / Math.max(1, box.height / 2);
      if (Math.hypot(ox, oy) > 0.35) {
        const angle = (Math.atan2(oy, ox) * 180) / Math.PI;
        let best = 0;
        RIM_ANGLES.forEach((candidate, k) => {
          const gap = Math.abs(((angle - candidate + 540) % 360) - 180);
          const bestGap = Math.abs(((angle - RIM_ANGLES[best]! + 540) % 360) - 180);
          if (gap < bestGap) best = k;
        });
        side = best;
      }
    }
    if (side !== this.shownRim) {
      this.shownRim = side;
      svg.querySelector('.lenzi-liquid-glass-rim')?.setAttribute('href', this.rims[side]!);
    }
    const slope = bright.toFixed(2);
    if (slope !== this.shownSlope) {
      this.shownSlope = slope;
      svg.querySelector('.lenzi-liquid-glass-rim-light')?.setAttribute('slope', slope);
    }
    return cornersChanged;
  }

  destroy(): void {
    this.svg?.remove();
    this.svg = null;
    this.element.style.removeProperty('backdrop-filter');
  }

  /** The element's corners' radius now, px (its top left one: the glass's corners are one radius). */
  private cornerRadius(): number {
    return parseFloat(this.document.defaultView?.getComputedStyle(this.element).borderTopLeftRadius ?? '0') || 0;
  }

  /** What the path covers at this size, one alpha a pixel (0 out, 255 in); null when it cannot be drawn. */
  private outline(path: string, width: number, height: number): Uint8ClampedArray | null {
    const [minX = 0, minY = 0, boxWidth = 100, boxHeight = 100] = this.settings().glassViewBox.trim().split(/[\s,]+/).map(Number);
    const context = Object.assign(this.document.createElement('canvas'), { width, height }).getContext('2d');
    if (!context || typeof Path2D !== 'function' || !(boxWidth > 0) || !(boxHeight > 0)) return null;
    const sx = width / boxWidth;
    const sy = height / boxHeight;
    context.setTransform(sx, 0, 0, sy, -minX * sx, -minY * sy);
    context.fill(new Path2D(path), 'evenodd');
    const pixels = context.getImageData(0, 0, width, height).data;
    const inside = new Uint8ClampedArray(width * height);
    for (let i = 0; i < inside.length; i++) inside[i] = pixels[i * 4 + 3]!;
    return inside;
  }
}

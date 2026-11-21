import { DOCUMENT, DestroyRef, Directive, ElementRef, afterNextRender, effect, inject, input, numberAttribute, untracked } from '@angular/core';

import { LenziSights } from '../sights/sights';
import { LenziGlassSurface, RIM_ANGLES, liquidGlassMaps, liquidGlassOutlineMaps } from './liquid-glass-maps';

let made = 0;
const SVG = 'http://www.w3.org/2000/svg';
/** How many frames apart the glass looks at its corners again (about half a second). */
const RADIUS_FRAMES = 30;

/** Whether this browser draws an SVG filter as a backdrop-filter (only Chromium does). */
function refracts(view: Window | null): boolean {
  const brands = (view?.navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } } | undefined)?.userAgentData?.brands;
  return !!brands?.some((brand) => /Chromium/i.test(brand.brand));
}

/**
 * Liquid Glass (lenzi, 2026-11-19: "deve essere quasi come il liquid glass di IOS, prova a fare un materiale che si
 * chiama appunto LenziLiquidGlass diverso dal classico vetro"; "il bordo voglio che rimanga nascosto fino all'ultimo";
 * the way: kube.io, "Liquid Glass in the Browser"). Not the kit's glass (`lenziLit`, a frosted pane with a border):
 * a clear slab with a curved bezel that bends what is behind it near its edge (refraction, an SVG filter as its
 * backdrop-filter), a little blur and saturation, and a rim of light only on its very edge. No border. The rim is lit
 * by the boids of a flock behind (lenzi: "quelli devono esserci solo quando i boidi ci si avvicinano"): none while none
 * is near, brighter the more come, on the side they come from, all round once they are under it
 * (`LenziSights.around`). Chromium bends; other browsers get the blur only.
 */
@Directive({
  selector: '[lenziLiquidGlass]',
  host: { class: 'lenzi-liquid-glass' },
})
export class LenziLiquidGlass {
  /** How wide the curved bezel is, px. */
  readonly bezel = input(28, { transform: numberAttribute });
  /** How thick the glass is, px: the thicker, the more it bends. */
  readonly thickness = input(56, { transform: numberAttribute });
  /** The glass's refractive index. */
  readonly ior = input(1.5, { transform: numberAttribute });
  /** How much of the bending is shown, 0 to 1 and beyond. */
  readonly refraction = input(1, { transform: numberAttribute });
  /** The bezel's profile. */
  readonly surface = input<LenziGlassSurface>('squircle');
  /** Blur of what is behind, px. */
  readonly blur = input(1.5, { transform: numberAttribute });
  /** Saturation of what is behind (1: as it is). */
  readonly saturation = input(1.5, { transform: numberAttribute });
  /** How bright the rim is, 0 to 1. */
  readonly rim = input(0.5, { transform: numberAttribute });
  /** Where the rim's light comes from with no flock to light it, degrees (-90: from the top). */
  readonly lightAngle = input(-60, { transform: numberAttribute });
  /** How many boids near the glass light its rim whole. */
  readonly rimBoids = input(60, { transform: numberAttribute });
  /**
   * A shape of its own (lenzi, 2026-11-19: Liquid Glass on the cat): an SVG path (filled even-odd), stretched over the
   * element as `glassViewBox` says, as a mask of the same path is; the bezel follows its outline. None: the element's
   * box, with its corners' radius.
   */
  readonly glassPath = input<string | null>(null);
  /** The path's view box, as SVG writes it ("min-x min-y width height"). */
  readonly glassViewBox = input('0 0 100 100');

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly id = `lenzi-liquid-glass-${++made}`;
  private readonly sights = inject(LenziSights);
  private svg: SVGSVGElement | null = null;
  private size = '';
  /** The corners' radius the filter was drawn for, px; and the frames since it was last looked at. */
  private radius = 0;
  private framesSinceRadius = 0;
  /** The rim pictures (data URLs) by side, the last from all round; which is shown, and how bright. */
  private rims: string[] = [];
  private shownRim = -1;
  private shownSlope = '';
  /** Draws the filter again at the next frame, once it is in the page. */
  private rebuild: (() => void) | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    // a setting changed: the filter again (its key says whether anything it is made of changed)
    effect(() => {
      void [this.bezel(), this.thickness(), this.ior(), this.refraction(), this.surface(), this.blur(), this.saturation(), this.rim(), this.lightAngle(), this.glassPath(), this.glassViewBox()];
      untracked(() => this.rebuild?.());
    });
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!refracts(view)) return;
      let frame: number | null = null;
      const later = () => {
        if (frame === null) frame = view?.requestAnimationFrame(() => ((frame = null), this.build())) ?? null;
      };
      this.rebuild = later;
      this.build();
      const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(later) : null;
      resize?.observe(this.element);
      // the rim, lit by the boids near the glass, at every frame
      let lighting: number | null = null;
      const light = () => {
        this.light();
        lighting = view?.requestAnimationFrame(light) ?? null;
      };
      light();
      destroyRef.onDestroy(() => {
        resize?.disconnect();
        if (frame !== null) view?.cancelAnimationFrame(frame);
        if (lighting !== null) view?.cancelAnimationFrame(lighting);
        this.svg?.remove();
        this.element.style.removeProperty('backdrop-filter');
      });
    });
  }

  /** The filter for the glass's size now: its maps drawn, its SVG in the page, then the glass pointed at it. */
  private build(): void {
    const box = this.element.getBoundingClientRect();
    const width = Math.round(box.width);
    const height = Math.round(box.height);
    if (width < 2 || height < 2) return;
    const radius = this.cornerRadius();
    this.radius = radius;
    const path = this.glassPath();
    const key = `${width}x${height}|${radius}|${this.bezel()}|${this.thickness()}|${this.ior()}|${this.surface()}|${this.lightAngle()}|${this.refraction()}|${this.blur()}|${this.saturation()}|${this.rim()}|${this.glassViewBox()}|${path ?? ''}`;
    if (key === this.size) return;
    this.size = key;
    const optics = { bezel: this.bezel(), thickness: this.thickness(), ior: this.ior(), surface: this.surface(), lightAngle: this.lightAngle() };
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
    const scale = (maps.scale * Math.max(0, this.refraction())).toFixed(2);
    const saturation = Math.max(0, this.saturation());
    svg.innerHTML = `<filter id="${this.id}" x="0" y="0" width="${width}" height="${height}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse">
  <feImage href="${picture(maps.displacement)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="map"/>
  <feDisplacementMap in="SourceGraphic" in2="map" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="bent"/>
  <feGaussianBlur in="bent" stdDeviation="${Math.max(0, this.blur())}" result="soft"/>
  <feColorMatrix in="soft" type="saturate" values="${saturation}" result="glass"/>
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

  /** The element's corners' radius now, px (its top left one: the glass's corners are one radius). */
  private cornerRadius(): number {
    return parseFloat(this.document.defaultView?.getComputedStyle(this.element).borderTopLeftRadius ?? '0') || 0;
  }

  /** What the path covers at this size, one alpha a pixel (0 out, 255 in); null when it cannot be drawn. */
  private outline(path: string, width: number, height: number): Uint8ClampedArray | null {
    const [minX = 0, minY = 0, boxWidth = 100, boxHeight = 100] = this.glassViewBox().trim().split(/[\s,]+/).map(Number);
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

  /**
   * The rim now: as bright as the boids near the glass are many (none: dark), from the side they are on, all round
   * once their middle is under the glass.
   */
  private light(): void {
    const svg = this.svg;
    if (!svg || this.rims.length === 0) return;
    // its corners, about twice a second: changed by the app's CSS (a class, a variable), the filter is drawn again for
    // them (lenzi, 2026-11-21: "tanti input non si aggiornano automaticamente"; read only when its size or a setting
    // changed, a new radius went unseen)
    if (++this.framesSinceRadius >= RADIUS_FRAMES) {
      this.framesSinceRadius = 0;
      if (this.cornerRadius() !== this.radius) this.rebuild?.();
    }
    const box = this.element.getBoundingClientRect();
    const middle = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    const crowd = this.sights.around(middle, Math.max(box.width, box.height) * 0.8);
    const bright = crowd ? Math.max(0, this.rim()) * Math.min(1, crowd.count / Math.max(1, this.rimBoids())) : 0;
    let side = this.rims.length - 1;
    if (crowd) {
      const ox = (crowd.x - middle.x) / Math.max(1, box.width / 2);
      const oy = (crowd.y - middle.y) / Math.max(1, box.height / 2);
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
  }
}

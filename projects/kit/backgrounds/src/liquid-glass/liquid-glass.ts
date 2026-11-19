import { DOCUMENT, DestroyRef, Directive, ElementRef, afterNextRender, inject, input, numberAttribute } from '@angular/core';

import { LenziGlassSurface, liquidGlassMaps } from './liquid-glass-maps';

let made = 0;
const SVG = 'http://www.w3.org/2000/svg';

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
 * backdrop-filter), a little blur and saturation, and a rim of light only on its very edge, where it faces the light.
 * No border. Chromium bends; other browsers get the blur only.
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
  /** Where the rim's light comes from, degrees (-90: from the top). */
  readonly lightAngle = input(-60, { transform: numberAttribute });

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly id = `lenzi-liquid-glass-${++made}`;
  private svg: SVGSVGElement | null = null;
  private size = '';

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!refracts(view)) return;
      let frame: number | null = null;
      const later = () => {
        if (frame === null) frame = view?.requestAnimationFrame(() => ((frame = null), this.build())) ?? null;
      };
      this.build();
      const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(later) : null;
      resize?.observe(this.element);
      destroyRef.onDestroy(() => {
        resize?.disconnect();
        if (frame !== null) view?.cancelAnimationFrame(frame);
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
    const radius = parseFloat(this.document.defaultView?.getComputedStyle(this.element).borderTopLeftRadius ?? '0') || 0;
    const key = `${width}x${height}|${radius}|${this.bezel()}|${this.thickness()}|${this.ior()}|${this.surface()}|${this.lightAngle()}|${this.refraction()}|${this.blur()}|${this.saturation()}|${this.rim()}`;
    if (key === this.size) return;
    this.size = key;
    const maps = liquidGlassMaps({
      width,
      height,
      radius,
      bezel: this.bezel(),
      thickness: this.thickness(),
      ior: this.ior(),
      surface: this.surface(),
      lightAngle: this.lightAngle(),
    });
    const picture = (data: Uint8ClampedArray) => {
      const canvas = this.document.createElement('canvas');
      canvas.width = maps.width;
      canvas.height = maps.height;
      canvas.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(data), maps.width, maps.height), 0, 0);
      return canvas.toDataURL();
    };
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
  <feImage href="${picture(maps.specular)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="light"/>
  <feComponentTransfer in="light" result="rim"><feFuncA type="linear" slope="${Math.max(0, this.rim())}"/></feComponentTransfer>
  <feBlend in="rim" in2="glass" mode="screen"/>
</filter>`;
    // the filter in the page before the glass points at it (pointed at first, Chromium shows nothing)
    if (!this.svg) {
      this.document.body.append(svg);
      this.svg = svg;
    }
    this.element.style.setProperty('backdrop-filter', `url(#${this.id})`);
  }
}

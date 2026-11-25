import { DOCUMENT, DestroyRef, Directive, ElementRef, afterNextRender, effect, inject, input, numberAttribute, untracked } from '@angular/core';

import { LenziSights } from '../sights/sights';
import { LenziGlassSurface } from './liquid-glass-maps';
import { LenziLiquidSurface, refracts } from './liquid-surface';

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
  private readonly glass = new LenziLiquidSurface(this.element, this.document, inject(LenziSights), () => ({
    bezel: this.bezel(),
    thickness: this.thickness(),
    ior: this.ior(),
    refraction: this.refraction(),
    surface: this.surface(),
    blur: this.blur(),
    saturation: this.saturation(),
    rim: this.rim(),
    lightAngle: this.lightAngle(),
    rimBoids: this.rimBoids(),
    glassPath: this.glassPath(),
    glassViewBox: this.glassViewBox(),
  }));
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
        if (frame === null) frame = view?.requestAnimationFrame(() => ((frame = null), this.glass.build())) ?? null;
      };
      this.rebuild = later;
      this.glass.build();
      const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(later) : null;
      resize?.observe(this.element);
      // the rim, lit by the boids near the glass, at every frame
      let lighting: number | null = null;
      const light = () => {
        if (this.glass.light()) later();
        lighting = view?.requestAnimationFrame(light) ?? null;
      };
      light();
      destroyRef.onDestroy(() => {
        resize?.disconnect();
        if (frame !== null) view?.cancelAnimationFrame(frame);
        if (lighting !== null) view?.cancelAnimationFrame(lighting);
        this.glass.destroy();
      });
    });
  }
}

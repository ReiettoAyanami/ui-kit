import { DestroyRef, Directive, ElementRef, afterNextRender, booleanAttribute, computed, effect, inject, input, signal, untracked } from '@angular/core';

import { LenziLightField, fitLight } from '../glow/light-field';
import { LenziLiquidEverywhere } from '../liquid-glass/liquid-everywhere';
import { LenziAmbientLight } from './ambient-light';

/**
 * A surface over a background, lit by it (lenzi, 2026-11-13: YouTube's buttons "like they're glass ...
 * responsive to flock / blob position and color"): it turns into glass (the background shows through
 * it, blurred, so it follows where the light is and what colour it has) and takes the background's
 * light as a veil over its colour and along its border. Only where the app asks: cards and panels
 * stay solid without it. Its colour is `--lenzi-lit-surface` (the page's surface unless set). The
 * styles are the kit's global ones (`.lenzi-lit`); Reduce transparency makes it solid and unlit.
 *
 * `[lenziLit]="overBackground"` lights it only while the app says so (lenzi, 2026-11-17: "wherever page we have a
 * background cards or any elements over the background should turn into lit elements"): off, it is the solid
 * surface it was, and takes no light. `lenziLit` alone is always on.
 *
 * In an app of Liquid Glass (`provideLenziLiquidGlass()`) a lit surface is Liquid Glass instead (lenzi, 2026-11-26: "Non
 * c'è ancora nulla che sia stato convertito in liquid glass, come i pannelli o altro"; "i bordi ... sono tutti
 * scattanti": the background's light came to it a few times a second): the app's glass takes it, its edge lit by what
 * is under it at every frame. `litOnly` keeps it lit glass (a demo of this material, a drawing's own layer).
 */
@Directive({
  selector: '[lenziLit]',
  // `.lenzi-lit` stays on a Liquid Glass one: an app gives its surfaces their own fill only `:not(.lenzi-lit)` (AI.md)
  host: { '[class.lenzi-lit]': 'lenziLit()', '[class.lenzi-liquid-lit]': 'liquid()', '[class.lenzi-lit-only]': 'lenziLit() && (litOnly() || kept())' },
})
export class LenziLit {
  /** Lit (the attribute alone: yes); off, the surface is what it is without it. */
  readonly lenziLit = input(true, { transform: booleanAttribute });
  /** Lit glass even in an app of Liquid Glass (the attribute alone: yes). */
  readonly litOnly = input(false, { transform: booleanAttribute });

  private readonly everywhere = inject(LenziLiquidEverywhere);
  /** Kept lit glass by the directive it serves (`lenziGlow`: a lamp is a light, not glass). */
  protected readonly kept = signal(false);
  /** Liquid Glass: the app is (its page surfaces too), and this surface is not kept lit. */
  protected readonly liquid = computed(() => this.lenziLit() && !this.litOnly() && !this.kept() && this.everywhere.on() && this.everywhere.pages);

  /** Keeps it lit glass in an app of Liquid Glass, as `litOnly` does (for a directive that has this one as its host's). */
  keepLit(): void {
    this.kept.set(true);
  }

  constructor() {
    const surface = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const light = inject(LenziAmbientLight);
    const field = inject(LenziLightField);
    const rendered = signal(false);
    /** Lets go of the light; null while it takes none. */
    let release: (() => void) | null = null;
    /** Gives it back from the app's glass; null while it is not glass. */
    let unadopt: (() => void) | null = null;

    const takeLight = () => {
      if (release) return;
      const unfit = fitLight(surface);
      // the background's light, and the light of the glowing elements around it (lenziGlow)
      const detach = light.attach(surface);
      const leave = field.addSurface(surface);
      release = () => {
        unfit();
        detach();
        leave();
        release = null;
      };
    };

    afterNextRender(() => rendered.set(true));
    effect(() => {
      if (!rendered()) return;
      const liquid = this.liquid();
      const lit = this.lenziLit() && !liquid;
      untracked(() => {
        if (lit) takeLight();
        else release?.();
        if (liquid && !unadopt) unadopt = this.everywhere.adopt(surface);
        else if (!liquid && unadopt) (unadopt(), (unadopt = null));
      });
    });
    inject(DestroyRef).onDestroy(() => {
      release?.();
      unadopt?.();
    });
  }
}

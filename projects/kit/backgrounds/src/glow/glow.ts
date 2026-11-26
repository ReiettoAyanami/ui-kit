import { DestroyRef, Directive, ElementRef, afterNextRender, booleanAttribute, computed, effect, inject, input, numberAttribute } from '@angular/core';

import { LenziLit } from '../ambient-light/lit';
import { LenziLightField, cssColor } from './light-field';

/**
 * A glowing element (lenzi, 2026-11-14: "a type of "material" that is basically a lit surface and
 * projects light directly onto the others component. This type of material can be used on every element
 * we have already (such as buttons, lists, ecc) . And i want it to be able to glow and effect the other
 * elements"): it is a lit surface (`lenziLit`, so other lamps light it too), and a lamp: it glows in its
 * colour, with a halo around it, and lights the lit surfaces near it on the side that faces it, on the
 * same plane as them. Any colour (lenzi: "ovviamente la luce di tutti i colori"); the lights of several
 * lamps add up. `[lenziGlow]="false"` switches it off, softly.
 */
@Directive({
  selector: '[lenziGlow]',
  hostDirectives: [LenziLit],
  host: {
    class: 'lenzi-glow',
    '[class.lenzi-glow-on]': 'on()',
    '[style.--lenzi-glow-color]': 'colour()',
    '[style.--lenzi-glow-strength]': 'strength()',
    '[style.--lenzi-glow-reach]': "reach() + 'px'",
  },
})
export class LenziGlow {
  /** On (`lenziGlow`, or `true`) or off. */
  readonly on = input(true, { alias: 'lenziGlow', transform: (value: unknown) => value === '' || booleanAttribute(value) });
  /** Its colour: any CSS colour, or a variable's name. The theme's accent unless set. */
  readonly glowColor = input('--mat-sys-primary');
  /** How bright, 0 (nothing) to 2. */
  readonly glowStrength = input(1, { transform: numberAttribute });
  /** How far its light reaches, CSS px. */
  readonly glowReach = input(220, { transform: numberAttribute });

  protected readonly colour = computed(() => cssColor(this.glowColor()));
  protected readonly strength = computed(() => Math.min(2, Math.max(0, this.glowStrength())));
  protected readonly reach = computed(() => Math.max(0, this.glowReach()));

  constructor() {
    // a lamp is a light, not glass: lit glass even in an app of Liquid Glass (2026-11-26: the home's lamp cat went dark)
    inject(LenziLit).keepLit();
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const field = inject(LenziLightField);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const remove = field.addLamp(element, () => ({ on: this.on(), color: this.glowColor(), strength: this.strength(), reach: this.reach() }));
      destroyRef.onDestroy(remove);
    });
    // switched on, or another colour: the light goes round again (it stops by itself when all are off)
    effect(() => {
      this.on();
      this.colour();
      this.strength();
      this.reach();
      field.wake();
    });
  }
}

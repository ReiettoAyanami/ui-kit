import { DestroyRef, Directive, ElementRef, inject, input, numberAttribute } from '@angular/core';

import { LenziScares } from './scares';

/**
 * Any element the boids of a flock background are scared of (lenzi, 2026-11-14: "an object that scares the
 * boids away"): near it they fly away from it, faster the nearer, wherever it is (it may move). How far its
 * fear reaches beyond its edge is `scareRadius`, px.
 */
@Directive({
  selector: '[lenziScare]',
})
export class LenziScare {
  /** How far beyond its edge the boids are scared of it, px. */
  readonly scareRadius = input(120, { transform: numberAttribute });

  constructor() {
    const element = inject<ElementRef<Element>>(ElementRef).nativeElement;
    const leave = inject(LenziScares).add(element, () => this.scareRadius());
    inject(DestroyRef).onDestroy(leave);
  }
}

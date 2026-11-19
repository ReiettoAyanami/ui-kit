import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { LenziGathers } from './gathers';

/**
 * A zone of the page the boids of a flock background gather under (lenzi, 2026-11-19: "i boidi devono rimanere sulla
 * zona di testo e spostarsi al prossimo scroll velocemente verso la nuova zona di testo e andare sotto tutta a quella
 * zona di testo"): of the zones on the page, the one the window shows most of. The boids hurry to it, spread under
 * all of it and stay there while it is the one; scrolled to another, they hurry there.
 */
@Directive({
  selector: '[lenziGather]',
})
export class LenziGather {
  constructor() {
    const element = inject<ElementRef<Element>>(ElementRef).nativeElement;
    const leave = inject(LenziGathers).add(element);
    inject(DestroyRef).onDestroy(leave);
  }
}

import { DestroyRef, Directive, ElementRef, inject, input, numberAttribute } from '@angular/core';

import { LenziGathers } from './gathers';

/**
 * A zone of the page the boids of a flock background gather under (lenzi, 2026-11-19: "i boidi devono rimanere sulla
 * zona di testo e spostarsi al prossimo scroll velocemente verso la nuova zona di testo e andare sotto tutta a quella
 * zona di testo"): of the zones on the page, the one the window shows most of. The boids hurry to it, spread under
 * all of it and stay there while it is the one; scrolled to another, they hurry there. Under the lines of its text, or
 * under its whole box (`gatherTo="box"`: a window of glass; "voglio che i boidi siano sulla forma delle finestra di
 * vetro"), a little past them (`gatherSpill`, px: "falli anche uscire un pochino").
 */
@Directive({
  selector: '[lenziGather]',
})
export class LenziGather {
  /** Under the lines of its text, or under its whole box. */
  readonly gatherTo = input<'text' | 'box'>('text');
  /** How far past them the boids may go, px. */
  readonly gatherSpill = input(0, { transform: numberAttribute });

  constructor() {
    const element = inject<ElementRef<Element>>(ElementRef).nativeElement;
    const leave = inject(LenziGathers).add(element, () => ({ to: this.gatherTo(), spill: this.gatherSpill() }));
    inject(DestroyRef).onDestroy(leave);
  }
}

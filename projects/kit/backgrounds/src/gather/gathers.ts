import { Injectable } from '@angular/core';

/** A zone of the page the boids gather under: its box, CSS px from the window's top left. */
export interface LenziGatherArea {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * The zones of the page the boids of a flock background gather under (`lenziGather`; lenzi, 2026-11-19: "i boidi
 * devono rimanere sulla zona di testo e spostarsi al prossimo scroll velocemente verso la nuova zona di testo e andare
 * sotto tutta a quella zona di testo"). The flock backgrounds read them at every step: of all of them, the one the
 * window shows most of is where the boids go.
 */
@Injectable({
  providedIn: 'root',
})
export class LenziGathers {
  private readonly elements = new Set<Element>();

  /** A zone the boids gather under. Gives back how to take it away. */
  add(element: Element): () => void {
    this.elements.add(element);
    return () => {
      this.elements.delete(element);
    };
  }

  /**
   * The zone the boids go to now: the one the window (`width` × `height`, CSS px) shows most of, its whole box;
   * null when none is on the screen.
   */
  area(width: number, height: number): LenziGatherArea | null {
    let best: LenziGatherArea | null = null;
    let most = 0;
    for (const element of this.elements) {
      const box = element.getBoundingClientRect();
      const shown = Math.max(0, Math.min(box.right, width) - Math.max(box.left, 0)) * Math.max(0, Math.min(box.bottom, height) - Math.max(box.top, 0));
      if (shown > most) {
        most = shown;
        best = { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
      }
    }
    return best;
  }
}

import { Injectable } from '@angular/core';

/** A point on the screen, CSS px from the window's top left. */
export interface LenziPoint {
  x: number;
  y: number;
}

/**
 * The things on the page worth looking at (lenzi, 2026-11-14: "If the mouse is not on the screen let the
 * cat follow the closest flock"): what moves by itself, a flock's boids. A background that has them says
 * where the nearest is; whatever looks around (`<lenzi-cat expression="watching">`) asks, when the pointer
 * is not there to look at. Nothing to set: it is there when a flock is.
 */
@Injectable({
  providedIn: 'root',
})
export class LenziSights {
  private readonly sources = new Map<object, (point: LenziPoint) => LenziPoint | null>();

  /** A source of sights: `nearest` says the nearest of its own to a point, both on the screen. Gives back how to take it away. */
  add(source: object, nearest: (point: LenziPoint) => LenziPoint | null): () => void {
    this.sources.set(source, nearest);
    return () => {
      this.sources.delete(source);
    };
  }

  /** The nearest sight to a point on the screen, of every source; null when there is none. */
  nearest(point: LenziPoint): LenziPoint | null {
    let best: LenziPoint | null = null;
    let least = Infinity;
    for (const nearest of this.sources.values()) {
      const sight = nearest(point);
      if (!sight) continue;
      const distance = Math.hypot(sight.x - point.x, sight.y - point.y);
      if (distance < least) {
        least = distance;
        best = sight;
      }
    }
    return best;
  }
}

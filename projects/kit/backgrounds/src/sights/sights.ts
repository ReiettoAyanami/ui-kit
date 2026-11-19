import { Injectable } from '@angular/core';

/** A point on the screen, CSS px from the window's top left. */
export interface LenziPoint {
  x: number;
  y: number;
}

/** Where some sights are: their middle, on the screen, and how many. */
export interface LenziCrowd extends LenziPoint {
  count: number;
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
  private readonly crowds = new Map<object, (point: LenziPoint, radius: number) => LenziCrowd | null>();

  /**
   * A source of sights: `nearest` says the nearest of its own to a point, both on the screen; `around`, when it can,
   * the middle of its own within `radius` px of a point and how many they are. Gives back how to take it away.
   */
  add(
    source: object,
    nearest: (point: LenziPoint) => LenziPoint | null,
    around?: (point: LenziPoint, radius: number) => LenziCrowd | null,
  ): () => void {
    this.sources.set(source, nearest);
    if (around) this.crowds.set(source, around);
    return () => {
      this.sources.delete(source);
      this.crowds.delete(source);
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

  /**
   * The middle of the sights within `radius` px of a point on the screen, of every source, and how many they are;
   * null when there is none (what lights solid text from behind: `lenziSolidText`).
   */
  around(point: LenziPoint, radius: number): LenziCrowd | null {
    let x = 0;
    let y = 0;
    let count = 0;
    for (const around of this.crowds.values()) {
      const crowd = around(point, radius);
      if (!crowd || crowd.count === 0) continue;
      x += crowd.x * crowd.count;
      y += crowd.y * crowd.count;
      count += crowd.count;
    }
    return count ? { x: x / count, y: y / count, count } : null;
  }
}

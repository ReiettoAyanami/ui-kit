import { Injectable } from '@angular/core';

/** Something on the screen the boids are scared of: a circle, CSS px from the window's top left. */
export interface LenziScareCircle {
  x: number;
  y: number;
  radius: number;
}

/**
 * The elements the boids of a flock background are scared of (`lenziScare`; lenzi, 2026-11-14: "make it an
 * option in the kit itself to have an object that scares the boids away"). The flock backgrounds read
 * them at every step: an element that moves scares them where it is now.
 */
@Injectable({
  providedIn: 'root',
})
export class LenziScares {
  private readonly elements = new Map<Element, () => number>();

  /** An element that scares the boids up to `radius()` px beyond its edge. Gives back how to take it away. */
  add(element: Element, radius: () => number): () => void {
    this.elements.set(element, radius);
    return () => {
      this.elements.delete(element);
    };
  }

  /** Every scaring element now, as a circle round its box, on the screen. */
  circles(): LenziScareCircle[] {
    const circles: LenziScareCircle[] = [];
    for (const [element, radius] of this.elements) {
      const box = element.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      circles.push({ x: box.left + box.width / 2, y: box.top + box.height / 2, radius: Math.max(box.width, box.height) / 2 + Math.max(0, radius()) });
    }
    return circles;
  }
}

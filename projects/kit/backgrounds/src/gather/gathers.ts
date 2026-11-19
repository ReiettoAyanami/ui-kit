import { Injectable } from '@angular/core';

/** A zone of the page the boids gather under: a box, CSS px from the window's top left. */
export interface LenziGatherArea {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * The lines of some text, from the boxes the browser gives for it (`Range.getClientRects`: one or more a line, one
 * for each piece of a line): the pieces of one line (they overlap in height) joined into one box, the empty ones
 * left out, top to bottom.
 */
export function linesOf(rects: Iterable<LenziGatherArea>): LenziGatherArea[] {
  const lines: LenziGatherArea[] = [];
  const sorted = [...rects].filter((rect) => rect.right > rect.left && rect.bottom > rect.top).sort((a, b) => a.top - b.top);
  for (const rect of sorted) {
    const line = lines.find((other) => Math.min(other.bottom, rect.bottom) - Math.max(other.top, rect.top) > (rect.bottom - rect.top) / 2);
    if (line) {
      line.left = Math.min(line.left, rect.left);
      line.right = Math.max(line.right, rect.right);
      line.top = Math.min(line.top, rect.top);
      line.bottom = Math.max(line.bottom, rect.bottom);
    } else {
      lines.push({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom });
    }
  }
  return lines;
}

/**
 * The zones of the page the boids of a flock background gather under (`lenziGather`; lenzi, 2026-11-19: "i boidi
 * devono rimanere sulla zona di testo e spostarsi al prossimo scroll velocemente verso la nuova zona di testo e andare
 * sotto tutta a quella zona di testo"). The flock backgrounds read them at every step: of all of them, the one the
 * window shows most of is where the boids go, and they go under each line of its text ("usa più zone nell'area di
 * testo altrimenti i boidi si mettono solo su una parte della scritta").
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
   * Where the boids go now: the zone the window (`width` × `height`, CSS px) shows most of, as the boxes of its lines
   * of text (its whole box when it has no text); none when no zone is on the screen.
   */
  areas(width: number, height: number): LenziGatherArea[] {
    let best: Element | null = null;
    let most = 0;
    for (const element of this.elements) {
      const box = element.getBoundingClientRect();
      const shown = Math.max(0, Math.min(box.right, width) - Math.max(box.left, 0)) * Math.max(0, Math.min(box.bottom, height) - Math.max(box.top, 0));
      if (shown > most) {
        most = shown;
        best = element;
      }
    }
    if (!best) return [];
    const range = best.ownerDocument?.createRange?.();
    if (range) {
      range.selectNodeContents(best);
      const lines = linesOf(Array.from(range.getClientRects?.() ?? []));
      range.detach?.();
      if (lines.length) return lines;
    }
    const box = best.getBoundingClientRect();
    return [{ left: box.left, top: box.top, right: box.right, bottom: box.bottom }];
  }
}

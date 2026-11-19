import { Injectable } from '@angular/core';

/**
 * How a zone takes the boids (lenzi, 2026-11-19: "voglio che i boidi siano sulla forma delle finestra di vetro non del
 * testo. inoltre falli anche uscire un pochino"): under the lines of its text, or under its whole box; and how far, px,
 * past them the boids may go.
 */
export interface LenziGatherOptions {
  to: 'text' | 'box';
  spill: number;
}

/** A zone of the page the boids gather under: a box, CSS px from the window's top left, and its corners' radius. */
export interface LenziGatherArea {
  left: number;
  top: number;
  right: number;
  bottom: number;
  radius?: number;
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
 * The boxes of the text an element shows, line by line: its text, not what is hidden from screen readers.
 */
function textRects(element: Element): LenziGatherArea[] {
  const document = element.ownerDocument;
  const range = document?.createRange?.();
  if (!range || !document.createTreeWalker) return [];
  const rects: LenziGatherArea[] = [];
  const walker = document.createTreeWalker(element, 4 /* NodeFilter.SHOW_TEXT */);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim() || node.parentElement?.closest('[aria-hidden="true"]')) continue;
    range.selectNodeContents(node);
    rects.push(...Array.from(range.getClientRects?.() ?? []));
  }
  range.detach?.();
  return rects;
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
  private readonly elements = new Map<Element, () => LenziGatherOptions>();

  /** A zone the boids gather under, and how (read at every step). Gives back how to take it away. */
  add(element: Element, options: () => LenziGatherOptions = () => ({ to: 'text', spill: 0 })): () => void {
    this.elements.set(element, options);
    return () => {
      this.elements.delete(element);
    };
  }

  /**
   * Where the boids go now: the zone the window (`width` × `height`, CSS px) shows most of, as the boxes of its lines
   * of text (its whole box when it has no text, or when it says `to: 'box'`), each grown by its `spill`; none when no
   * zone is on the screen.
   */
  areas(width: number, height: number): LenziGatherArea[] {
    let best: Element | null = null;
    let most = 0;
    for (const element of this.elements.keys()) {
      const box = element.getBoundingClientRect();
      const shown = Math.max(0, Math.min(box.right, width) - Math.max(box.left, 0)) * Math.max(0, Math.min(box.bottom, height) - Math.max(box.top, 0));
      if (shown > most) {
        most = shown;
        best = element;
      }
    }
    if (!best) return [];
    const { to, spill } = this.elements.get(best)!();
    const grow = Math.max(0, spill);
    const grown = (area: LenziGatherArea): LenziGatherArea => ({ left: area.left - grow, top: area.top - grow, right: area.right + grow, bottom: area.bottom + grow, radius: (area.radius ?? 0) + grow });
    const lines = to === 'text' ? linesOf(textRects(best)) : [];
    if (lines.length) return lines.map(grown);
    const box = best.getBoundingClientRect();
    // the box with its rounded corners (a window of glass: the flock takes its shape)
    const view = best.ownerDocument?.defaultView;
    const radius = (view && parseFloat(view.getComputedStyle(best).borderTopLeftRadius)) || 0;
    return [grown({ left: box.left, top: box.top, right: box.right, bottom: box.bottom, radius })];
  }
}

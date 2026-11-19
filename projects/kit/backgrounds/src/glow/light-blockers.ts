import { Injectable } from '@angular/core';

/** Something on the page that stops light coming from behind it: it draws its own shape (screen px) when asked. */
export interface LenziLightBlocker {
  /** Fills its shape, in CSS px of the window, on a 2D context already scaled to them. */
  draw(context: CanvasRenderingContext2D): void;
}

/**
 * What stops the light of a glowing background behind the page (lenzi, 2026-11-19: "i boidi sono fatti di luce e il
 * testo blocca luce. Boidi > Testo > Utente"): solid words (`lenziSolidText`). The light rays (`<lenzi-light-rays>`)
 * cut their shape out of the light at every frame.
 */
@Injectable({
  providedIn: 'root',
})
export class LenziLightBlockers {
  private readonly blockers = new Set<LenziLightBlocker>();

  /** A blocker of light. Gives back how to take it away. */
  add(blocker: LenziLightBlocker): () => void {
    this.blockers.add(blocker);
    return () => {
      this.blockers.delete(blocker);
    };
  }

  /** Every blocker now. */
  all(): readonly LenziLightBlocker[] {
    return [...this.blockers];
  }
}

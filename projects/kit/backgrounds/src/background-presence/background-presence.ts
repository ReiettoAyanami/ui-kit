import { Injectable, Signal, computed, inject, signal } from '@angular/core';

/**
 * Whether the page has a background behind it (lenzi, 2026-11-19: the kit knows it by itself, the app wires nothing).
 * The kit's backgrounds behind the whole page say so themselves while they are there: the glowing ones (blobs, a
 * flock, a scene) and a plain one with a picture (a photo, a gradient); one behind a box does not count. The page's
 * glass pane (`lenziGlassPage`) and its lit surfaces (`lenziOverBackground()`) read it. An app never calls `add`.
 */
@Injectable({
  providedIn: 'root',
})
export class LenziBackgroundPresence {
  private readonly count = signal(0);

  /** Some background is behind the whole page. */
  readonly present = computed(() => this.count() > 0);

  /** A background behind the whole page is there: gives back how to say it is gone (once). */
  add(): () => void {
    this.count.update((count) => count + 1);
    let gone = false;
    return () => {
      if (gone) return;
      gone = true;
      this.count.update((count) => count - 1);
    };
  }
}

/**
 * Whether the page is over a background, for its surfaces (an injection context): lit over one, solid without
 * (RULES.md, "Over a background, every card and element of the page is lit"), `[lenziLit]="lit()"`.
 */
export function lenziOverBackground(): Signal<boolean> {
  return inject(LenziBackgroundPresence).present;
}

import { DOCUMENT, Injectable, Signal, inject, signal } from '@angular/core';

/**
 * A phone, as the kit's styles say it: a window under 600 px wide (`@media (max-width: 599px)`). The one place the
 * kit says it in code, so that an app's code and the kit's styles turn to the phone at the same width (lenzi,
 * 2026-11-20: "A, più la scena che sceglie da sola"; it was the catalog's alone, and an app wrote its own).
 */
export const LENZI_PHONE_QUERY = '(max-width: 599px)';

/** Whether the window is a phone's (`LENZI_PHONE_QUERY`), changing when the window does: one listener for the app. */
@Injectable({
  providedIn: 'root',
})
export class LenziPhone {
  private readonly phone = signal(false);
  /** The window is a phone's; never one where there is no window to ask (a server). */
  readonly matches: Signal<boolean> = this.phone.asReadonly();

  constructor() {
    // a root service lives as long as the app: its listener with it
    const media = inject(DOCUMENT).defaultView?.matchMedia?.(LENZI_PHONE_QUERY);
    if (!media) return;
    this.phone.set(media.matches);
    media.addEventListener('change', (event) => this.phone.set(event.matches));
  }
}

/** The window is a phone's, as a signal (in a constructor or a field: an injection context). */
export function lenziPhone(): Signal<boolean> {
  return inject(LenziPhone).matches;
}

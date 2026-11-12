import { DOCUMENT, Injectable, InjectionToken, effect, inject, signal } from '@angular/core';

import { readPreference, writePreference } from '../util/preferences';

/**
 * The name this app's browser preferences are kept under (`<id>.reduce-transparency`). An app that
 * had its own before the kit gives its old name, so nobody loses a choice: substance-tracker gives
 * 'substance-tracker'.
 */
export const KIT_APP_ID = new InjectionToken<string>('KIT_APP_ID', { factory: () => 'kit' });

/**
 * How the app looks on this browser (RULES.md, "Glass"). One choice today: Reduce transparency
 * (lenzi, 2026-10-01), like Android's own switch. Windows, menus and bars are see-through and blur
 * what is under them; reduced, they are solid again. It marks <html> with `reduce-transparency`,
 * which the kit's styles read; the system's own wish (prefers-reduced-transparency) is followed by
 * the styles too. A display choice: this browser remembers it, never a database. provideKit()
 * creates it at start, so the choice applies from the first page, not only on the settings page.
 */
@Injectable({
  providedIn: 'root',
})
export class KitAppearance {
  private readonly document = inject(DOCUMENT);
  private readonly key = `${inject(KIT_APP_ID)}.reduce-transparency`;

  readonly reduceTransparency = signal(
    readPreference<boolean>(this.key, (v) => (v === 'true' ? true : v === 'false' ? false : null), false),
  );

  constructor() {
    effect(() => this.document.documentElement.classList.toggle('reduce-transparency', this.reduceTransparency()));
  }

  setReduceTransparency(reduce: boolean): void {
    this.reduceTransparency.set(reduce);
    writePreference(this.key, String(reduce));
  }
}

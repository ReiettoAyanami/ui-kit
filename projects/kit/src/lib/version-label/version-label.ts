import { Component, input } from '@angular/core';

/**
 * The app's version in the bottom right corner of every page (lenzi, 2026-10-03: "metti in basso la
 * sottoversione in basso a destra"), small and faint, under the "+" and the windows, never in the
 * way of a tap. The app gives the version (from its API, or its build); nothing shows until it has
 * one. From substance-tracker and vtiger-reader `ui/version-label`, without the request: the app
 * makes it.
 */
@Component({
  selector: 'kit-version-label',
  imports: [],
  templateUrl: './version-label.html',
  styleUrl: './version-label.css',
  host: { '[class.inline]': "placement() === 'inline'" },
})
export class KitVersionLabel {
  /** The version running: "dev26.0.0.0002"; null or empty while it is not known. */
  readonly version = input<string | null>(null);
  /** fixed: the screen's corner (the only place in an app); inline: where its host puts it. */
  readonly placement = input<'fixed' | 'inline'>('fixed');
}

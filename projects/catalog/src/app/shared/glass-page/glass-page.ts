import { Component, computed, inject } from '@angular/core';

import { LenziLit } from '@lenzi/ui-kit/backgrounds';

import { CurrentBackground } from '../current-background';

/**
 * A page of the catalog over a background (lenzi, 2026-11-17: "whenever we have a background like this, we need a
 * glass panel behind like in overview and components"): `<main class="page" appGlassPage>`. While the page has a
 * scene behind it (CurrentBackground), a glass pane lies behind its elements, the overview's (2026-11-14: "add a
 * glass pane around the elements at the center"): lit glass (`lenziLit`) with a panel's border and radius, away from
 * the screen's edges; on a phone the whole screen ("on mobile make the glass pane on the back fullscreen"). Without a
 * background, nothing changes.
 *
 * The pane is a layer of its own, not the elements' container, so glass over it still blurs the background (a glass
 * container would be their backdrop root); and the page gets no layer of its own (no z-index), so a search bar in it
 * still rides into the top bar (`lenziShellSearch`).
 */
@Component({
  selector: 'main[appGlassPage]',
  imports: [LenziLit],
  templateUrl: './glass-page.html',
  styleUrl: './glass-page.css',
  host: { '[class.app-glass-page]': 'shown()' },
})
export class GlassPage {
  private readonly current = inject(CurrentBackground);

  /** The page has a scene behind it. */
  protected readonly shown = computed(() => this.current.scene() !== null);
}

import { Component, inject } from '@angular/core';

import { LenziLit } from '../ambient-light/lit';
import { LenziBackgroundPresence } from '../background-presence/background-presence';

/**
 * A page over a background (RULES.md, "A page over a background has a glass pane behind its elements"; lenzi,
 * 2026-11-17: "whenever we have a background like this, we need a glass panel behind like in overview and
 * components"): `<main lenziGlassPage>`. While a background of the kit is behind the whole page
 * (LenziBackgroundPresence), a glass pane lies behind the page's elements: lit glass (`lenziLit`) with a panel's
 * border and radius, away from the screen's edges; on a phone the whole screen ("on mobile make the glass pane on the
 * back fullscreen"). Without a background, nothing changes. Moved from the catalog into the kit on 2026-11-19 (lenzi:
 * the kit knows by itself).
 *
 * The pane is a layer of its own, not the elements' container, so glass over it still blurs the background (a glass
 * container would be their backdrop root); and the page gets no layer of its own (no z-index), so a search bar in it
 * still rides into the top bar (`lenziShellSearch`).
 */
@Component({
  selector: '[lenziGlassPage]',
  imports: [LenziLit],
  templateUrl: './glass-page.html',
  styleUrl: './glass-page.css',
  host: { '[class.lenzi-glass-page]': 'shown()' },
})
export class LenziGlassPage {
  /** A background is behind the page. */
  protected readonly shown = inject(LenziBackgroundPresence).present;
}

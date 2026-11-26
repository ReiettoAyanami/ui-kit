import { Component, computed, inject } from '@angular/core';

import { LenziAppShell } from '@lenzi/ui-kit';

import { LenziLit } from '../ambient-light/lit';
import { LenziBackgroundPresence } from '../background-presence/background-presence';
import { LenziLiquidEverywhere } from '../liquid-glass/liquid-everywhere';

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
  host: { '[class.lenzi-glass-page]': 'shown()', '[class.lenzi-glass-page-titled]': '!!title()' },
})
export class LenziGlassPage {
  /** A background is behind the page. */
  protected readonly shown = inject(LenziBackgroundPresence).present;
  /**
   * The app is Liquid Glass (`provideLenziLiquidGlass()`): the pane is the kit's glass, the side bar's, frosted to read on
   * (lenzi, 2026-11-25: "I pannelli dietro per esempio devono essere in vetro, ti ho detto come dovevano essere calcolati
   * i bordi"), not lit glass with a border.
   */
  protected readonly liquid = inject(LenziLiquidEverywhere).on;
  /**
   * The page's title, at the top of the page, in its column (lenzi, 2026-11-25: "togli la barra sopra che non ha senso,
   * metti un titolo normale un po' grande"; "il titolo è troppo vicino al lato"; 2026-11-26, one place for it on every
   * page): the shell's, when it has the bar of pages (no top bar). The shell then shows none of its own; a page with its
   * own h1 keeps it, and this one is hidden.
   */
  private readonly shell = inject(LenziAppShell, { optional: true });
  protected readonly title = computed(() => (this.shell?.tabs() ? this.shell.shownTitle() : null));
}

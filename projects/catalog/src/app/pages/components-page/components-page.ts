import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';

import { LenziPreviewCard, LenziShelf, LenziShowcase, LenziShowcaseSlide, LenziStatusMessage } from '@lenzi/ui-kit';
import { LenziGlassPage, LenziGlassSearch, LenziLit, lenziOverBackground } from '@lenzi/ui-kit/backgrounds';

import { CATEGORIES, DOCS, KitDoc } from '../../registry';
import { Miniature } from '../../shared/miniature';
import { PublicPages } from '../../shared/public-pages';
import { USAGE_EXAMPLES, UsageExampleView } from '../../shared/usage-example/usage-example';

/** How wide a screen a card's live demo is laid out on, px: the card shows it small. */
const DEMO_SCREEN = 720;

/**
 * Every page of the kit (lenzi, 2026-11-26, proposal F: "Fai la f, ma nella vetrina ci circolano i pezzi / vari esempi
 * di come utilizzarli"): on top a showcase whose slides take turns, each a piece of the kit in use; under it a shelf a
 * category, its pieces in a row that scrolls sideways. A search (in the URL, `?q=`, replacing the entry, so back does
 * not walk through the letters) puts the showcase away and leaves the shelves of what it found.
 */
@Component({
  selector: 'app-components-page',
  imports: [
    LenziGlassPage,
    LenziGlassSearch,
    LenziLit,
    LenziPreviewCard,
    LenziShelf,
    LenziShowcase,
    LenziShowcaseSlide,
    LenziStatusMessage,
    MatButtonModule,
    MatIconModule,
    Miniature,
    RouterLink,
    UsageExampleView,
  ],
  templateUrl: './components-page.html',
  styleUrl: './components-page.css',
})
export class ComponentsPage {
  /** Over a background its surfaces are lit, solid without one (RULES.md, 2026-11-17). */
  protected readonly lit = lenziOverBackground();

  /** The search, from the URL. */
  readonly q = input<string | undefined>(undefined);

  private readonly router = inject(Router);
  private readonly publicPages = inject(PublicPages);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly screen = DEMO_SCREEN;

  /** The showcase's slides whose piece whoever is looking may see. */
  protected readonly examples = computed(() => USAGE_EXAMPLES.filter((example) => this.publicPages.shows(`components/${example.piece}`)));

  protected readonly groups = computed(() => {
    const words = (this.q() ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const shown = (doc: KitDoc) => this.publicPages.shows(`components/${doc.id}`);
    const matches = (doc: KitDoc) => {
      const text = `${doc.name} ${doc.summary} ${doc.api} ${doc.category} ${doc.origin}`.toLowerCase();
      return words.every((word) => text.includes(word));
    };
    return CATEGORIES.map((category) => {
      const all = DOCS.filter((doc) => doc.category === category && shown(doc));
      return { category, total: all.length, docs: all.filter(matches) };
    }).filter((group) => group.docs.length > 0);
  });

  /** The card pointed at: its demo runs in it, the others show how they are used. */
  protected readonly live = signal<string | null>(null);
  private readonly frames = new Map<string, SafeResourceUrl>();

  protected frame(id: string): SafeResourceUrl {
    let url = this.frames.get(id);
    if (!url) this.frames.set(id, (url = this.sanitizer.bypassSecurityTrustResourceUrl(`/frame/${id}`)));
    return url;
  }

  protected point(id: string, active: boolean): void {
    if (active) this.live.set(id);
    else if (this.live() === id) this.live.set(null);
  }

  protected open(id: string): void {
    void this.router.navigate(['/components', id]);
  }

  protected search(text: string): void {
    void this.router.navigate([], { queryParams: { q: text || null }, queryParamsHandling: 'merge', replaceUrl: true });
  }
}

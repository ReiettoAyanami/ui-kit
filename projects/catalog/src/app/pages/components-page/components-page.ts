import { Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { LenziSearchBar, LenziStatusMessage } from '@lenzi/ui-kit';

import { CATEGORIES, DOCS, KitDoc } from '../../registry';
import { PublicPages } from '../../shared/public-pages';
import { LenziGlassPage, LenziLit, lenziOverBackground } from '@lenzi/ui-kit/backgrounds';

/**
 * Every page of the kit, by category, with a search bar (RULES.md: the search is in the URL, `?q=`,
 * replacing the entry, so back does not walk through the letters).
 */
@Component({
  selector: 'app-components-page',
  imports: [LenziGlassPage, LenziLit, LenziSearchBar, LenziStatusMessage, MatIconModule, RouterLink],
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

  protected readonly groups = computed(() => {
    const words = (this.q() ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matches = (doc: KitDoc) => {
      const text = `${doc.name} ${doc.summary} ${doc.api} ${doc.category} ${doc.origin}`.toLowerCase();
      // only the pages whoever is looking may see (the admin chooses what the public sees)
      return this.publicPages.shows(`components/${doc.id}`) && words.every((word) => text.includes(word));
    };
    return CATEGORIES.map((category) => ({ category, docs: DOCS.filter((doc) => doc.category === category && matches(doc)) })).filter(
      (group) => group.docs.length > 0,
    );
  });

  protected search(text: string): void {
    void this.router.navigate([], { queryParams: { q: text || null }, queryParamsHandling: 'merge', replaceUrl: true });
  }
}

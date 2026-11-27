import { Component, Type, computed, inject, input, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { LenziPreviewCard, LenziShelf, LenziStatusMessage } from '@lenzi/ui-kit';
import { LenziShowcase, LenziShowcaseSlide } from '@lenzi/ui-kit/backgrounds';
import { LenziGlassPage, LenziGlassSearch, LenziLit, lenziOverBackground } from '@lenzi/ui-kit/backgrounds';

import { CATEGORIES, DOCS, KitDoc, Values, defaults } from '../../registry';
import { InView } from '../../shared/in-view';
import { Miniature } from '../../shared/miniature';
import { PublicPages } from '../../shared/public-pages';
import { USAGE_EXAMPLES, UsageExampleView } from '../../shared/usage-example/usage-example';

/** How wide a screen a card's demo is laid out on, px: the card shows it small. */
const DEMO_SCREEN = 440;

/**
 * The pieces that act on the whole page (a shell, a page of glass, a bar, the appearance, a page that is not found, a
 * blocking screen): their card shows an emblem, never their demo in a frame (lenzi, 2026-11-27: "nelle schede non usare
 * degli iframe, prende troppa memoria e la pagina lagga, metti solo l'elemento singolo o un'icona rappresentativa").
 */
const EMBLEMS: Readonly<Record<string, string>> = {
  'app-shell': 'web',
  'glass-page': 'layers',
  'glass-tab-bar': 'tab',
  appearance: 'contrast',
  'not-found': 'search_off',
  'blocking-screen': 'block',
};

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
    InView,
    Miniature,
    NgComponentOutlet,
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

  /** The card pointed at: a demo that moves by itself moves only there (RULES.md, Cards). */
  protected readonly live = signal<string | null>(null);
  /** The cards near the window: only they make their demo (a browser keeps a few WebGL pictures at once). */
  protected readonly near = signal<ReadonlySet<string>>(new Set());
  /** Each piece's demo, once loaded. */
  protected readonly demos = signal<ReadonlyMap<string, Type<unknown>>>(new Map());
  private readonly inputs = new Map<string, { values: Values }>();

  /** A piece that acts on the whole page shows its emblem (`EMBLEMS`), not its demo. */
  protected emblem(id: string): string | null {
    return EMBLEMS[id] ?? null;
  }

  /** The card came near the window, or went: its demo is made, loaded the first time, or put away. */
  protected seen(doc: KitDoc, near: boolean): void {
    this.near.update((ids) => {
      const next = new Set(ids);
      if (near) next.add(doc.id);
      else next.delete(doc.id);
      return next;
    });
    if (near && !(doc.id in EMBLEMS) && !this.demos().has(doc.id)) {
      void doc.demo().then((type) => this.demos.update((demos) => new Map(demos).set(doc.id, type)));
    }
  }

  /** The demo's inputs: its parameters as they start, still unless pointed at (the same object while nothing changes). */
  protected inputsOf(doc: KitDoc): { values: Values } {
    const moving = doc.controls.some((control) => control.key === 'animate');
    const key = `${doc.id}:${moving && this.live() === doc.id}`;
    let inputs = this.inputs.get(key);
    if (!inputs) {
      inputs = { values: moving ? { ...defaults(doc), animate: this.live() === doc.id } : defaults(doc) };
      this.inputs.set(key, inputs);
    }
    return inputs;
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

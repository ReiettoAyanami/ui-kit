import { Component, DOCUMENT, DestroyRef, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { LenziFigure, LenziFigureGrid } from '@lenzi/ui-kit';
import { BlobMaterial, LenziBlobBackground, LenziBlobFlock, LenziBlobFlockBackground, LenziLit } from '@lenzi/ui-kit/backgrounds';
import { CAT_ASPECT, LenziCat } from '@lenzi/ui-kit/svgs';

import { CodeEditor } from '../../shared/code-editor/code-editor';
import { CATEGORIES, DOCS } from '../../registry';
import { PublicPages } from '../../shared/public-pages';

/** The cat's width in the corner, px: never smaller, never larger. */
const MASCOT_LEAST = 260;
const MASCOT_MOST = 720;
/** On a phone, smaller (lenzi, 2026-11-14: "on mobile make the cat smaller"): about 40% of the screen's width. */
const MASCOT_PHONE_LEAST = 140;
const MASCOT_PHONE_MOST = 220;

/** A phone, as the page's styles say it (max-width: 599px). */
const PHONE = '(max-width: 599px)';

/** The first page: what the kit is, how an app takes it, and where everything is. */
@Component({
  selector: 'app-overview-page',
  imports: [CodeEditor, LenziBlobBackground, LenziBlobFlockBackground, LenziCat, LenziLit, LenziFigure, LenziFigureGrid, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './overview-page.html',
  styleUrl: './overview-page.css',
})
export class OverviewPage {
  private readonly publicPages = inject(PublicPages);

  /**
   * The cat in the corner (lenzi, 2026-11-14: "in the bottom right corner zoomed in a lot ... the cat lower
   * half should be cut by the bottom of the screen for now", then "cat should be bigger, a bit more on top"):
   * its width, px, 42% of the window's, between 260 and 720; a little over a third of it below the screen.
   */
  /**
   * The background's blobs and fleets (lenzi, 2026-11-14: "una flotta di boidi normali, una flotta di boidi
   * blob vetro che ricevono luce e una flotta di boidi blob dello stesso materiale di quella corrente ... per
   * ogni flotta un blob grande, un/due blob piccoli dello stesso materiale").
   */
  protected readonly blobMaterials: readonly BlobMaterial[] = ['lamp', 'glass', 'lamp', 'glass', 'lamp', 'glass'];
  protected readonly blobSizes: readonly number[] = [0.2, 0.2, 0.085, 0.085, 0.065, 0.065];
  protected readonly fleets: readonly LenziBlobFlock[] = [
    { material: 'glass', count: 42, colonies: 3 },
    { material: 'lamp', count: 48, colonies: 3 },
  ];

  /**
   * On a phone only the blobs, half of them (lenzi, 2026-11-14: "on mobile ... put only the blobs and less around
   * (50%)"): a large lamp, a large glass and a small lamp; no boids, no fleets.
   */
  protected readonly phoneMaterials: readonly BlobMaterial[] = ['lamp', 'glass', 'lamp'];
  protected readonly phoneSizes: readonly number[] = [0.2, 0.2, 0.085];

  protected readonly phone = signal(false);
  protected readonly mascot = signal(MASCOT_LEAST);
  protected readonly aspect = CAT_ASPECT;
  /** How much of the cat is below the screen ("a bit more on top"). */
  protected readonly BELOW = 0.38;
  constructor() {
    const view = inject(DOCUMENT).defaultView;
    if (!view) return;
    const fit = () => {
      const phone = view.matchMedia?.(PHONE).matches ?? false;
      const [least, most] = phone ? [MASCOT_PHONE_LEAST, MASCOT_PHONE_MOST] : [MASCOT_LEAST, MASCOT_MOST];
      this.phone.set(phone);
      this.mascot.set(Math.round(Math.min(most, Math.max(least, view.innerWidth * 0.42))));
    };
    fit();
    view.addEventListener('resize', fit, { passive: true });
    inject(DestroyRef).onDestroy(() => view.removeEventListener('resize', fit));
  }

  /** What whoever is looking may see (the admin chooses what the public sees). */
  private readonly shownDocs = computed(() => DOCS.filter((doc) => this.publicPages.shows(`components/${doc.id}`)));
  protected readonly components = computed(() => this.shownDocs().length);
  protected readonly categories = computed(() => CATEGORIES.filter((category) => this.shownDocs().some((doc) => doc.category === category)).length);
  protected readonly sections = computed(() => this.everySection.filter((section) => this.publicPages.shows(section.link.slice(1))));

  private readonly everySection = [
    { link: '/components', icon: 'widgets', title: 'Components', text: 'Every piece of the kit: a live demo, its parameters, its rules, its AI notes and its code.' },
    { link: '/rules', icon: 'rule', title: 'Rules', text: 'The look and the behaviour every app follows: Material 3, heavily modified.' },
    { link: '/ai-rules', icon: 'smart_toy', title: 'AI rules', text: 'How Claude works with the kit: read first, compose, never restyle, add to the kit first.' },
    { link: '/variables', icon: 'tune', title: 'Variables', text: 'The global variables of the look: what each one is for, its value and why.' },
    { link: '/libraries', icon: 'inventory_2', title: 'Libraries', text: 'Every frontend library the apps use, its version and its rules.' },
  ];

  protected readonly start = `# like Angular Material: one command sets it up
ng add @lenzi/ui-kit
# today, from the package built here (npm run pack)
ng add "@lenzi/ui-kit@file:../ui-kit/dist/lenzi-ui-kit-0.1.0.tgz"

# it adds the peer dependencies, the kit's styles first in angular.json,
# and provideLenziKit({ appId }) with the API errors' interceptor in app.config.ts;
# then: import { LenziAppShell, LenziNavList } from '@lenzi/ui-kit';`;


}

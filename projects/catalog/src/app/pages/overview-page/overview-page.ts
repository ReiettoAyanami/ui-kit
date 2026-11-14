import { Component, DOCUMENT, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { LenziFigure, LenziFigureGrid } from '@lenzi/ui-kit';
import { LenziBlobFlockBackground, LenziLit } from '@lenzi/ui-kit/backgrounds';
import { CAT_ASPECT, LenziCat } from '@lenzi/ui-kit/svgs';

import { CodeEditor } from '../../shared/code-editor/code-editor';
import { CATEGORIES, DOCS } from '../../registry';
import { PublicPages } from '../../shared/public-pages';

/** The cat's width in the corner, px: never smaller, never larger. */
const MASCOT_LEAST = 260;
const MASCOT_MOST = 720;

/** The first page: what the kit is, how an app takes it, and where everything is. */
@Component({
  selector: 'app-overview-page',
  imports: [CodeEditor, LenziBlobFlockBackground, LenziCat, LenziLit, LenziFigure, LenziFigureGrid, MatButtonModule, MatIconModule, RouterLink],
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
  protected readonly mascot = signal(MASCOT_LEAST);
  protected readonly aspect = CAT_ASPECT;
  /** How much of the cat is below the screen ("a bit more on top"). */
  protected readonly BELOW = 0.38;
  /** The pointer is over the cat: it wakes up ("close his eyes (but stay happy when the mouse hovers)"). */
  protected readonly awake = signal(false);
  private readonly cat = viewChild('mascotCat', { read: ElementRef<HTMLElement> });

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    if (!view) return;
    const fit = () => this.mascot.set(Math.round(Math.min(MASCOT_MOST, Math.max(MASCOT_LEAST, view.innerWidth * 0.42))));
    fit();
    // the cat takes no pointer (the page under it stays usable): the window says where the pointer is
    const look = (event: PointerEvent) => {
      const box = this.cat()?.nativeElement.getBoundingClientRect();
      this.awake.set(!!box && event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom);
    };
    const gone = (event: PointerEvent) => {
      if (event.relatedTarget === null) this.awake.set(false);
    };
    view.addEventListener('resize', fit, { passive: true });
    view.addEventListener('pointermove', look, { passive: true });
    view.document.addEventListener('pointerout', gone, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      view.removeEventListener('resize', fit);
      view.removeEventListener('pointermove', look);
      view.document.removeEventListener('pointerout', gone);
    });
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

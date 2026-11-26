import { Component, DOCUMENT, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { LenziBento, LenziBentoTile, LenziFigure, LenziFigureGrid, LenziStatusMessage, couldNotLoad, lenziPhone } from '@lenzi/ui-kit';
import {
  LenziGlassOption,
  LenziGlassPage,
  LenziGlassSearch,
  LenziGlassSegmented,
  LenziGlassSlider,
  LenziGlassSwitch,
  LenziSceneBackground,
} from '@lenzi/ui-kit/backgrounds';
import { LenziCat } from '@lenzi/ui-kit/svgs';

import { CATEGORIES, DOCS } from '../../registry';
import { HOME_PHONE_SCENE, HOME_SCENE } from '../../scenes';
import { KitSave, KitServer } from '../../shared/kit-server';
import { PublicPages } from '../../shared/public-pages';

/** The command that adds the kit to an app. */
const COMMAND = 'ng add @lenzi/ui-kit';
/**
 * The home's scene in its tile is drawn as if behind a window this tall at its shorter side, px, then shrunk to the tile:
 * its blobs, its glow and its boids look as they did behind the home (drawn at the tile's size they washed it out).
 */
const SCENE_SIDE = 640;
/** How many saves the tile of changes shows. */
const LATEST = 3;
const WHEN = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

/**
 * The first page (lenzi, 2026-11-26, proposal A of the overview's layouts: "vai con la a"): a bento of glass tiles over
 * the scene, the size of each saying how much it matters. What the kit is and how an app takes it, the components with
 * the kit's own controls live in their tile, the scenes, the variables, the cat in a tile of its own (in the corner it
 * covered half of the links), the rules, the AI rules, the libraries, and what was saved last. A section the admin
 * hides from the public has no tile.
 */
@Component({
  selector: 'app-overview-page',
  imports: [
    LenziBento,
    LenziBentoTile,
    LenziCat,
    LenziFigure,
    LenziFigureGrid,
    LenziGlassPage,
    LenziGlassSearch,
    LenziGlassSegmented,
    LenziGlassSlider,
    LenziGlassSwitch,
    LenziSceneBackground,
    LenziStatusMessage,
    MatButtonModule,
    MatIconModule,
    RouterLink,
  ],
  templateUrl: './overview-page.html',
  styleUrl: './overview-page.css',
})
export class OverviewPage {
  private readonly publicPages = inject(PublicPages);
  private readonly router = inject(Router);
  private readonly server = inject(KitServer);
  private readonly phone = lenziPhone();

  /** What whoever is looking may see (the admin chooses what the public sees). */
  private readonly shownDocs = computed(() => DOCS.filter((doc) => this.publicPages.shows(`components/${doc.id}`)));
  protected readonly components = computed(() => this.shownDocs().length);
  protected readonly categories = computed(() => CATEGORIES.filter((category) => this.shownDocs().some((doc) => doc.category === category)).length);

  /** A section has a tile only while the public may see its page. */
  protected shows(path: string): boolean {
    return this.publicPages.shows(path);
  }

  protected readonly command = COMMAND;
  protected readonly copied = signal(false);

  /** The command, copied (the button says so for two seconds); where the clipboard is refused, nothing happens. */
  protected copy(): void {
    void navigator.clipboard?.writeText(COMMAND).then(
      () => {
        this.copied.set(true);
        const timer = setTimeout(() => this.copied.set(false), 2000);
        this.destroyRef.onDestroy(() => clearTimeout(timer));
      },
      () => undefined,
    );
  }
  private readonly destroyRef = inject(DestroyRef);

  // The kit's own controls in the components' tile: they only show themselves.
  protected readonly glass = signal(true);
  protected readonly periods: readonly LenziGlassOption[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ];
  protected readonly period = signal<string | null>('week');
  protected readonly strength = signal(60);

  /** The search of the components' tile opens the components with it (their page keeps it in the URL, `?q=`). */
  protected find(text: string): void {
    void this.router.navigate(['/components'], { queryParams: { q: text.trim() || null } });
  }

  /** The home's scene, in the Scenes tile: alive, the lighter one on a phone. */
  protected readonly homeScene = HOME_SCENE;
  protected readonly homePhoneScene = HOME_PHONE_SCENE;
  /** Where it is drawn: the tile's size at a window's scale (SCENE_SIDE), and how much it is shrunk to fit the tile. */
  protected readonly stage = signal({ width: SCENE_SIDE, height: SCENE_SIDE, scale: 1 });
  private readonly scenesTile = viewChild('scenesTile', { read: ElementRef });

  /** The colours the variables' tile shows: the theme's own. */
  protected readonly swatches = ['--mat-sys-primary', '--mat-sys-primary-container', '--mat-sys-tertiary', '--mat-sys-surface-container-highest', '--mat-sys-error'];

  /** Wide enough for the cat at its largest (its tile is a quarter of the row there). */
  private readonly wide = signal(false);
  /** The cat's width in its tile, px: smaller where its tile is narrower, so its name stays clear. */
  protected readonly catSize = computed(() => (this.phone() ? 170 : this.wide() ? 230 : 160));

  constructor() {
    const destroyRef = inject(DestroyRef);
    // the scene's stage follows its tile's size
    afterNextRender(() => {
      const tile = this.scenesTile()?.nativeElement as HTMLElement | undefined;
      if (!tile || typeof ResizeObserver !== 'function') return;
      const fit = () => {
        const width = tile.clientWidth;
        const height = tile.clientHeight;
        const scale = Math.min(1, Math.max(0.1, Math.min(width, height) / SCENE_SIDE));
        this.stage.set({ width: Math.ceil(width / scale), height: Math.ceil(height / scale), scale });
      };
      fit();
      const watch = new ResizeObserver(fit);
      watch.observe(tile);
      destroyRef.onDestroy(() => watch.disconnect());
    });
    const query = inject(DOCUMENT).defaultView?.matchMedia?.('(min-width: 1100px)');
    if (!query) return;
    const fit = () => this.wide.set(query.matches);
    fit();
    query.addEventListener('change', fit);
    destroyRef.onDestroy(() => query.removeEventListener('change', fit));
  }

  // What was saved last into the kit (the History page's saves), the newest first: read only while the History page is
  // shown (its data is served with it; hidden, the overview asks for nothing).
  private readonly saves = rxResource({ params: () => (this.shows('history') ? true : undefined), stream: () => this.server.history() });
  protected readonly savesFailure = computed(() => (this.saves.error() ? couldNotLoad('the saves', this.saves.error()) : null));
  protected readonly latest = computed(() =>
    this.saves.hasValue() ? this.saves.value().slice(0, LATEST).map((save) => ({ id: save.id, title: titleOf(save), when: WHEN.format(new Date(save.at)) })) : null,
  );
}

/** A save in a few words: the file, or the variable (or how many). */
function titleOf(save: KitSave): string {
  const what = save.kind === 'file' ? (save.path ?? 'A file') : save.changes?.length === 1 ? save.changes[0]!.name : `${save.changes?.length ?? 0} variables`;
  return save.restores ? `${what}, undone` : what;
}

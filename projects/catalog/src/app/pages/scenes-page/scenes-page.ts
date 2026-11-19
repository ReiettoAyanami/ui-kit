import { NgTemplateOutlet } from '@angular/common';
import { Component, DOCUMENT, DestroyRef, ElementRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';

import { LenziCardMenu, LenziConfirmData, LenziConfirmDialog, LenziDialogs, LenziMenuAction, LenziPreviewCard, LenziStatusMessage, couldNotLoad } from '@lenzi/ui-kit';
import { LenziGlassPage, LenziLit, lenziOverBackground, LenziScene } from '@lenzi/ui-kit/backgrounds';

import { InView } from '../../shared/in-view';
import { KitServer } from '../../shared/kit-server';
import { Miniature } from '../../shared/miniature';
import { SavedScene, SavedScenes } from '../../shared/saved-scenes';
import { sceneToCode } from '../../shared/scene-code';
import { HOME_PHONE_SCENE, HOME_SCENE } from '../../scenes';
import { SCENE_FRAME_READY, sceneFrameMessage } from '../scene-view-page/scene-view-page';

/** A scene's card in the gallery. */
export interface SceneCard {
  /** One key per card: a kept scene's id, a scene of the code's constant. */
  key: string;
  /** The scene as the server keeps it; null: a scene of the catalog's code. */
  saved: SavedScene | null;
  title: string;
  /** Its facts, one a line. */
  lines: string[];
  /** The scene as its link's code. */
  code: string;
  /** The scene alone, still: its card's frame. */
  preview: SafeResourceUrl;
}

/** How many cards the gallery shows at first, and how many more at each "Show more". */
export const GALLERY_STEP = 12;
/** How many previews are drawn at once: a browser keeps only a few WebGL pictures alive (Chrome: 16). */
export const LIVE_PREVIEWS = 12;
/** How wide a screen a preview shows its scene on, px: the card is its miniature. */
export const PREVIEW_SCREEN = 800;

const WHEN = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' });
const count = (many: number, one: string, more: string) => (many === 0 ? `no ${more}` : many === 1 ? `1 ${one}` : `${many} ${more}`);

/** What a scene holds, in a line. */
export function sceneHolds(scene: LenziScene): string {
  return `${count(scene.blobs.length, 'blob', 'blobs')}, ${count(scene.fleets.length, 'fleet', 'fleets')}`;
}

/**
 * The Scenes tab (lenzi, 2026-11-14: "La scena dev'essere configurabile da una tab apposta"): it sends whoever
 * comes to the scene maker ("per gli utenti normali la sezione scene porta solo al playground per la
 * creazione/condivisione"). The admin finds the gallery of the scenes kept on the server ("la sezione admin puó
 * creare varie scene, quindi la sezione scene lo porta a quelle salvate (una galleria con le varie scene e una
 * piccola preview delle tali con una scheda ... al posto della thumbnail metti iframe della scena, ma fai partire
 * solo la simulazione di quella on hover"): a preview card each, its scene in a frame, still until the card is
 * pointed at; a tap opens it in the maker, its ⋮ copies its link or takes it out. After them, the scenes the
 * catalog's code keeps (its pages' backgrounds).
 */
@Component({
  selector: 'app-scenes-page',
  imports: [LenziGlassPage, InView, LenziCardMenu, LenziLit, LenziPreviewCard, LenziStatusMessage, MatButtonModule, MatIconModule, Miniature, NgTemplateOutlet, RouterLink],
  templateUrl: './scenes-page.html',
  styleUrl: './scenes-page.css',
})
export class ScenesPage {
  /** Over a background its surfaces are lit, solid without one (RULES.md, 2026-11-17). */
  protected readonly lit = lenziOverBackground();

  protected readonly server = inject(KitServer);
  private readonly scenes = inject(SavedScenes);
  private readonly dialogs = inject(LenziDialogs);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** The scenes kept on the server, the last saved first; null while they load. */
  protected readonly saved = signal<SceneCard[] | null>(null);
  /** Why they could not be loaded. */
  protected readonly error = signal<string | null>(null);
  /** How many of them are shown ("Show more" adds some). */
  protected readonly shownCount = signal(GALLERY_STEP);
  protected readonly shownSaved = computed(() => (this.saved() ?? []).slice(0, this.shownCount()));

  /** The scenes of the catalog's code, with the constant that holds each. */
  protected readonly built = signal<SceneCard[]>([]);

  /** The cards near the window, and the one pointed at. */
  private readonly near = signal<ReadonlySet<string>>(new Set());
  private readonly active = signal<string | null>(null);
  /** The cards whose scene is drawn: the first few near the window, in the gallery's order. */
  protected readonly live = computed(() => {
    const near = this.near();
    return new Set([...this.shownSaved(), ...this.built()].map((card) => card.key).filter((key) => near.has(key)).slice(0, LIVE_PREVIEWS));
  });

  protected readonly savedActions: LenziMenuAction[] = [
    { id: 'open', label: 'Open in the maker', icon: 'brush' },
    { id: 'link', label: 'Copy the link', icon: 'link' },
    { id: 'iframe', label: 'Copy the iframe', icon: 'code' },
    { id: 'delete', label: 'Delete', icon: 'delete', destructive: true },
  ];
  protected readonly builtActions = this.savedActions.filter((action) => !action.destructive);
  protected readonly screen = PREVIEW_SCREEN;

  constructor() {
    // the gallery is the admin's: loaded once the admin is known to be here
    effect(() => {
      if (!this.server.admin()) return;
      untracked(() => {
        this.load();
        void Promise.all(
          [
            { scene: HOME_SCENE, constant: 'HOME_SCENE' },
            { scene: HOME_PHONE_SCENE, constant: 'HOME_PHONE_SCENE' },
          ].map(({ scene, constant }) => this.card(`code:${constant}`, null, scene, `In the code: ${constant}`)),
        ).then((cards) => this.built.set(cards));
      });
    });
    // a frame says when its scene is ready to be told: the one pointed at starts then
    const view = this.document.defaultView;
    const onMessage = (event: MessageEvent) => {
      if ((event.data as { type?: unknown } | null)?.type !== SCENE_FRAME_READY) return;
      const frame = this.frames().find((found) => found.contentWindow === event.source);
      if (frame) this.tell(frame, frame.dataset['scene'] === this.active());
    };
    view?.addEventListener('message', onMessage);
    inject(DestroyRef).onDestroy(() => view?.removeEventListener('message', onMessage));
  }

  private load(): void {
    this.scenes.list().subscribe({
      next: async (scenes) => {
        const cards = await Promise.all(scenes.map((saved) => this.card(saved.id, saved, saved.scene, `Saved on ${WHEN.format(new Date(saved.updatedAt))}`)));
        this.saved.set(cards);
        this.error.set(null);
      },
      error: (error: unknown) => this.error.set(couldNotLoad('the scenes', error)),
    });
  }

  private async card(key: string, saved: SavedScene | null, scene: LenziScene, fact: string): Promise<SceneCard> {
    const code = await sceneToCode(scene);
    return {
      key,
      saved,
      title: scene.name || 'A scene without a name',
      lines: [sceneHolds(scene), fact],
      code,
      preview: this.sanitizer.bypassSecurityTrustResourceUrl(`${this.link(code)}&still`),
    };
  }

  /** The link that shows a scene alone (the view page). */
  private link(code: string): string {
    return new URL(`scene?s=${code}`, this.document.baseURI).href;
  }

  private frames(): HTMLIFrameElement[] {
    return [...this.host.querySelectorAll<HTMLIFrameElement>('iframe[data-scene]')];
  }

  /** Tells a card's frame to play its scene, or to be still. */
  private tell(frame: HTMLIFrameElement, play: boolean): void {
    frame.contentWindow?.postMessage(sceneFrameMessage(play), this.document.defaultView?.location.origin ?? '*');
  }

  /** A card came near the window, or left: its scene is drawn only while it is there. */
  protected seen(key: string, near: boolean): void {
    this.near.update((keys) => {
      const next = new Set(keys);
      if (near) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  /** A card is pointed at, or no more: its scene plays only meanwhile ("fai partire solo la simulazione di quella on hover"). */
  protected play(key: string, on: boolean): void {
    if (on) this.active.set(key);
    else if (this.active() === key) this.active.set(null);
    const frame = this.frames().find((found) => found.dataset['scene'] === key);
    if (frame) this.tell(frame, on);
  }

  /** A tap on a card: its scene in the maker; a kept one is saved again from there. */
  protected open(card: SceneCard): void {
    void this.router.navigate(['/scenes/maker'], { queryParams: { s: card.code, ...(card.saved ? { id: card.saved.id } : {}) } });
  }

  protected act(card: SceneCard, action: string): void {
    if (action === 'open') this.open(card);
    else if (action === 'link') void this.copy(this.link(card.code), 'The link to the scene is in the clipboard');
    else if (action === 'iframe') {
      void this.copy(`<iframe src="${this.link(card.code)}" title="${card.title}" style="border: 0; width: 100%; height: 100%"></iframe>`, 'The iframe is in the clipboard');
    } else if (action === 'delete' && card.saved) void this.delete(card, card.saved);
  }

  private async copy(text: string, said: string): Promise<void> {
    await this.document.defaultView?.navigator.clipboard?.writeText(text);
    this.snackBar.open(said, 'OK', { duration: 3000 });
  }

  /** Asks first; the server keeps the scene marked, so the snackbar can put it back. */
  private async delete(card: SceneCard, saved: SavedScene): Promise<void> {
    const deleted = await this.dialogs.open<LenziConfirmDialog, LenziConfirmData, true>(LenziConfirmDialog, {
      title: `Delete “${card.title}”?`,
      message: 'It goes out of the gallery. A link to it copied before still works: the scene is in the link itself.',
      confirm: 'Delete',
      action: () => this.scenes.remove(saved.id),
    });
    if (!deleted) return;
    this.saved.update((cards) => cards?.filter((found) => found.key !== card.key) ?? null);
    this.snackBar
      .open(`“${card.title}” is out of the gallery`, 'Undo', { duration: 8000 })
      .onAction()
      .subscribe(() => this.scenes.restore(saved.id).subscribe({ next: () => this.load(), error: (error: unknown) => this.error.set(couldNotLoad('the scenes', error)) }));
  }

  protected showMore(): void {
    this.shownCount.update((shown) => shown + GALLERY_STEP);
  }
}

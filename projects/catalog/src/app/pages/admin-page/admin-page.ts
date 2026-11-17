import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { LenziConfirmData, LenziConfirmDialog, LenziDialogs, LenziFigure, LenziFigureGrid, LenziStatusMessage, couldNotLoad, describeError } from '@lenzi/ui-kit';

import { CODE_SCENES } from '../../scenes';
import { KitServer } from '../../shared/kit-server';
import { PageBackground, PageBackgrounds, choiceOf, choiceValue } from '../../shared/page-backgrounds';
import { PublicPages } from '../../shared/public-pages';
import { SavedScene, SavedScenes } from '../../shared/saved-scenes';
import { SitePage } from '../../site-map';

/**
 * Where the catalog's one admin signs in (lenzi, 2026-11-12: "pagina admin per abilitare la modifica
 * (unico utente). L'endpoint pubblico mostra solo le info."). Signed out, the catalog shows the kit and
 * lets anyone try changes in their own browser; signed in, the changes are saved into the kit: the
 * variables everywhere, the kit's files where the server changes them. The user and the password are
 * the server's (its .env), never the catalog's.
 *
 * Signed in, the admin also chooses which pages the public sees (lenzi, 2026-11-13): the pages of the
 * site map that are not the catalog itself, each with its toggle (PublicPages). The overview and the
 * components are always public.
 *
 * And each page's background (lenzi, 2026-11-17: "Make it possible so i can configure the various backgrounds of
 * the pages"): a scene of the catalog's code, one of the gallery or none, on a computer and on a phone
 * (PageBackgrounds); the same for every visitor, saved at once.
 */
@Component({
  selector: 'app-admin-page',
  imports: [
    LenziFigure,
    LenziFigureGrid,
    LenziStatusMessage,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    RouterLink,
  ],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.css',
})
export class AdminPage {
  private readonly dialogs = inject(LenziDialogs);
  protected readonly server = inject(KitServer);

  protected readonly publicPages = inject(PublicPages);

  /** The pages the admin shows or hides, from the site map; the catalog itself is not among them. */
  protected readonly rows = computed(() => {
    const hidden = this.publicPages.hidden() ?? new Set<string>();
    return this.publicPages.toggled.map((page) => ({ page, shown: !hidden.has(page.key) }));
  });
  protected readonly shownCount = computed(() => this.rows().filter((row) => row.shown).length);
  /** The overview, the components and each piece: always public. */
  protected readonly alwaysCount = this.publicPages.all.filter((page) => page.always && page.key !== 'admin').length;
  protected readonly savingPages = signal(false);
  protected readonly pagesError = signal<string | null>(null);

  protected readonly backgrounds = inject(PageBackgrounds);
  private readonly savedScenes = inject(SavedScenes);
  /** The gallery's scenes, to choose from; null until known. */
  protected readonly gallery = signal<SavedScene[] | null>(null);
  protected readonly galleryError = signal<string | null>(null);
  protected readonly savingBackground = signal(false);
  protected readonly backgroundError = signal<string | null>(null);
  /** The catalog's scenes, by the name a background gives them. */
  protected readonly codeScenes = Object.entries(CODE_SCENES).map(([code, scene]) => ({ value: choiceValue({ code }), name: scene.name ?? code }));

  /** What a page may have behind it, besides nothing: the catalog's scenes, then the admin's (the gallery). */
  protected readonly sceneGroups = computed(() => {
    const gallery = (this.gallery() ?? []).map((scene) => ({ value: choiceValue({ saved: scene.id }), name: scene.name || 'A scene without a name' }));
    return [{ label: "In the catalog's code", options: this.codeScenes }, ...(gallery.length ? [{ label: 'Your scenes', options: gallery }] : [])];
  });

  /** Every page that may have a background, with what it has: the admin's choice, or the catalog's own. */
  protected readonly backgroundRows = computed(() => {
    const listed = new Set([...this.codeScenes.map((scene) => scene.value), ...(this.gallery() ?? []).map((scene) => choiceValue({ saved: scene.id }))]);
    return this.backgrounds.pages.map((page) => {
      const background = this.backgrounds.of(page.key);
      const missing = this.backgrounds.missing(page.key);
      const computer = choiceValue(background.computer);
      const phone = choiceValue(background.phone);
      // a scene of the gallery not in the list (taken out, or the list not here yet): an option of its own
      const other = (value: string, gone: boolean) =>
        value.startsWith('saved:') && !listed.has(value) ? { value, label: gone ? 'Taken out of the gallery' : 'One of your scenes' } : null;
      return { ...page, computer, phone, otherComputer: other(computer, missing.computer), otherPhone: other(phone, missing.phone), missing: missing.computer || missing.phone };
    });
  });

  protected readonly user = signal('');
  protected readonly password = signal('');
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);

  /** What signing in changes on this server, in words. */
  protected readonly files = computed(() =>
    this.server.session()?.files
      ? 'Saved into the repo: code, rules, AI notes, libraries'
      : 'Read only here: they change on the development server, and a new build shows them',
  );

  protected async signIn(event: Event): Promise<void> {
    event.preventDefault();
    if (this.sending() || !this.user() || !this.password()) return;
    this.sending.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.server.signIn(this.user(), this.password()));
      this.password.set('');
    } catch (error) {
      this.error.set(describeError(error));
    } finally {
      this.sending.set(false);
    }
  }

  /** Shows pages to the public or hides them: saved at once, for every visitor. */
  protected async setPublic(pages: readonly SitePage[], shown: boolean): Promise<void> {
    if (this.savingPages()) return;
    this.savingPages.set(true);
    this.pagesError.set(null);
    try {
      await firstValueFrom(this.publicPages.setPublic(pages.map((page) => page.key), shown));
    } catch (error) {
      this.pagesError.set(`Not saved: ${describeError(error)}`);
    } finally {
      this.savingPages.set(false);
    }
  }

  protected setAll(shown: boolean): void {
    void this.setPublic(this.rows().map((row) => row.page), shown);
  }

  constructor() {
    // signed in: the gallery's scenes, to choose a page's background from
    effect(() => {
      if (!this.server.admin()) return;
      untracked(() => this.loadGallery());
    });
  }

  private loadGallery(): void {
    this.galleryError.set(null);
    this.savedScenes.list().subscribe({
      next: (scenes) => this.gallery.set(scenes),
      error: (error: unknown) => this.galleryError.set(couldNotLoad('your scenes', error)),
    });
  }

  /** Chooses what a page has behind it, on a computer or on a phone: drawn at once, saved for every visitor. */
  protected async setBackground(key: string, on: 'computer' | 'phone', value: string): Promise<void> {
    if (this.savingBackground()) return;
    const before = this.backgrounds.of(key);
    const choice = choiceOf(value);
    const next: PageBackground = on === 'computer' ? { ...before, computer: choice === 'same' ? null : choice } : { ...before, phone: choice };
    this.savingBackground.set(true);
    this.backgroundError.set(null);
    try {
      await firstValueFrom(this.backgrounds.set(key, next, this.gallery() ?? []));
    } catch (error) {
      this.backgroundError.set(`Not saved: ${describeError(error)}`);
    } finally {
      this.savingBackground.set(false);
    }
  }

  /** Signing out asks first (RULES.md), not destructive. */
  protected signOut(): void {
    void this.dialogs.open<LenziConfirmDialog, LenziConfirmData, true>(LenziConfirmDialog, {
      title: 'Sign out?',
      message: 'The catalog goes back to showing the kit: changes stay in this browser until you sign in again.',
      confirm: 'Sign out',
      destructive: false,
      action: () => this.server.signOut(),
    });
  }
}

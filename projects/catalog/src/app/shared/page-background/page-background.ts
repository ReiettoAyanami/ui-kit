import { Component, DOCUMENT, DestroyRef, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

import { LenziSceneBackground } from '@lenzi/ui-kit/backgrounds';

import { PHONE_QUERY } from '../../scenes';
import { PageBackgrounds, backgroundKey } from '../page-backgrounds';

/**
 * The background of the page that is open (lenzi, 2026-11-17: "Make it possible so i can configure the various
 * backgrounds of the pages"): one, behind the shell, the scene the admin chose for this page or the catalog's own
 * (PageBackgrounds); on a phone the phone's, changing when the window does. One for every page, so going from a
 * page to another with the same scene keeps it flying. Nothing behind a frame or a page that is a scene itself.
 */
@Component({
  selector: 'app-page-background',
  imports: [LenziSceneBackground],
  templateUrl: './page-background.html',
  styleUrl: './page-background.css',
})
export class PageBackground {
  private readonly backgrounds = inject(PageBackgrounds);
  private readonly router = inject(Router);

  /** The window is a phone's. */
  readonly phone = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly scene = computed(() => this.backgrounds.sceneFor(backgroundKey(this.url()), this.phone()));

  constructor() {
    const media = inject(DOCUMENT).defaultView?.matchMedia?.(PHONE_QUERY);
    if (!media) return;
    this.phone.set(media.matches);
    const changed = (event: MediaQueryListEvent) => this.phone.set(event.matches);
    media.addEventListener('change', changed);
    inject(DestroyRef).onDestroy(() => media.removeEventListener('change', changed));
  }
}

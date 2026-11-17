import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

import { PHONE_QUERY } from '../scenes';
import { PageBackgrounds, backgroundKey } from './page-backgrounds';

/**
 * What is behind the page that is open: its scene, on this window (a phone's or not), or none. One answer for the
 * background drawn behind the shell (PageBackground) and the glass pane a page puts over it (GlassPage), so the two
 * never disagree.
 */
@Injectable({
  providedIn: 'root',
})
export class CurrentBackground {
  private readonly backgrounds = inject(PageBackgrounds);
  private readonly router = inject(Router);

  /** The window is a phone's, changing when the window does. */
  readonly phone = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** The scene behind the open page; null: none (or not known yet). */
  readonly scene = computed(() => this.backgrounds.sceneFor(backgroundKey(this.url()), this.phone()));

  constructor() {
    // a root service lives as long as the app: the listener with it
    const media = inject(DOCUMENT).defaultView?.matchMedia?.(PHONE_QUERY);
    if (!media) return;
    this.phone.set(media.matches);
    media.addEventListener('change', (event) => this.phone.set(event.matches));
  }
}

import { Component, DOCUMENT, DestroyRef, computed, inject, signal } from '@angular/core';

import { LenziSceneBackground } from '@lenzi/ui-kit/backgrounds';

import { HOME_PHONE_SCENE, HOME_SCENE, PHONE_QUERY } from '../../scenes';

/**
 * The home's scene behind a page of the catalog (the overview, the components: lenzi, 2026-11-14: "put the same
 * scene that there's on the overview in the background of the components"): the whole one, or on a phone the
 * lighter one ("on mobile ... put only the blobs and less around (50%)"), changing when the window does.
 */
@Component({
  selector: 'app-home-scene',
  imports: [LenziSceneBackground],
  templateUrl: './home-scene.html',
  styleUrl: './home-scene.css',
})
export class HomeScene {
  /** The window is a phone's. */
  readonly phone = signal(false);

  protected readonly scene = computed(() => (this.phone() ? HOME_PHONE_SCENE : HOME_SCENE));

  constructor() {
    const media = inject(DOCUMENT).defaultView?.matchMedia?.(PHONE_QUERY);
    if (!media) return;
    this.phone.set(media.matches);
    const changed = (event: MediaQueryListEvent) => this.phone.set(event.matches);
    media.addEventListener('change', changed);
    inject(DestroyRef).onDestroy(() => media.removeEventListener('change', changed));
  }
}

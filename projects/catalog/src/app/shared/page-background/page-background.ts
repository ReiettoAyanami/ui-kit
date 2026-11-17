import { Component, inject } from '@angular/core';

import { LenziSceneBackground } from '@lenzi/ui-kit/backgrounds';

import { CurrentBackground } from '../current-background';

/**
 * The background of the page that is open (lenzi, 2026-11-17: "Make it possible so i can configure the various
 * backgrounds of the pages"): one, behind the shell, the scene the admin chose for this page or the catalog's own
 * (PageBackgrounds, through CurrentBackground); on a phone the phone's, changing when the window does. One for every
 * page, so going from a page to another with the same scene keeps it flying. Nothing behind a frame or a page that is
 * a scene itself. The page puts a glass pane over it (GlassPage).
 */
@Component({
  selector: 'app-page-background',
  imports: [LenziSceneBackground],
  templateUrl: './page-background.html',
  styleUrl: './page-background.css',
})
export class PageBackground {
  protected readonly scene = inject(CurrentBackground).scene;
}

import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { LenziStatusMessage } from '@lenzi/ui-kit';
import { LenziScene, LenziSceneBackground } from '@lenzi/ui-kit/backgrounds';

import { sceneFromCode } from '../../shared/scene-code';

/**
 * A scene alone, from its link (lenzi, 2026-11-14: "una scena sia ricreabile tramite un link (corto) condivisibile
 * e iframe"): `/scene?s=<code>`, the whole page and nothing else, for a tab or an iframe. `&still` draws one still
 * frame (a gallery's card, until pointed at).
 */
@Component({
  selector: 'app-scene-view-page',
  imports: [LenziSceneBackground, LenziStatusMessage, MatButtonModule, RouterLink],
  templateUrl: './scene-view-page.html',
  styleUrl: './scene-view-page.css',
})
export class SceneViewPage {
  private readonly route = inject(ActivatedRoute);

  /** The link's scene; null while it is read, false when the link holds none. */
  protected readonly scene = signal<LenziScene | null | false>(null);
  protected readonly still = this.route.snapshot.queryParamMap.has('still');
  protected readonly code = this.route.snapshot.queryParamMap.get('s') ?? '';

  constructor() {
    void sceneFromCode(this.code).then((scene) => this.scene.set(scene ?? false));
  }
}

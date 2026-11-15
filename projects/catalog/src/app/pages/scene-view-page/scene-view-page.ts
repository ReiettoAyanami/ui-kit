import { Component, DOCUMENT, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { LenziStatusMessage } from '@lenzi/ui-kit';
import { LenziScene, LenziSceneBackground } from '@lenzi/ui-kit/backgrounds';

import { sceneFromCode } from '../../shared/scene-code';

/** What the page that frames a scene tells it: play, or be still. */
export const SCENE_FRAME_PLAY = 'lenzi-scene-play';
/** What a framed scene tells the page around it once it listens. */
export const SCENE_FRAME_READY = 'lenzi-scene-ready';

export interface SceneFrameMessage {
  type: typeof SCENE_FRAME_PLAY;
  play: boolean;
}

/** The message that starts a framed scene, or stops it (`frame.contentWindow.postMessage(...)`). */
export function sceneFrameMessage(play: boolean): SceneFrameMessage {
  return { type: SCENE_FRAME_PLAY, play };
}

/**
 * A scene alone, from its link (lenzi, 2026-11-14: "una scena sia ricreabile tramite un link (corto) condivisibile
 * e iframe"): `/scene?s=<code>`, the whole page and nothing else, for a tab or an iframe. `&still` draws one still
 * frame (a gallery's card, until pointed at); the page that frames it starts and stops it with a message ("fai
 * partire solo la simulazione di quella on hover"), without loading it again.
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
  /** One still frame: the link says so at first, then the page around the frame. */
  protected readonly still = signal(this.route.snapshot.queryParamMap.has('still'));
  protected readonly code = this.route.snapshot.queryParamMap.get('s') ?? '';

  constructor() {
    void sceneFromCode(this.code).then((scene) => this.scene.set(scene ?? false));

    // framed: the page around it says when to play (only that page: a message from anywhere else is not heard)
    const view = inject(DOCUMENT).defaultView;
    if (!view || view.parent === view) return;
    const onMessage = (event: MessageEvent) => {
      const message = event.data as Partial<SceneFrameMessage> | null;
      if (event.source !== view.parent || message?.type !== SCENE_FRAME_PLAY || typeof message.play !== 'boolean') return;
      this.still.set(!message.play);
    };
    view.addEventListener('message', onMessage);
    inject(DestroyRef).onDestroy(() => view.removeEventListener('message', onMessage));
    view.parent.postMessage({ type: SCENE_FRAME_READY }, '*');
  }
}

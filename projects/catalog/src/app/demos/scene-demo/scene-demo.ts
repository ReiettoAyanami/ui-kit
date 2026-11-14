import { Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { BoidsFollow, LenziLit, LenziScene, LenziSceneBackground } from '@lenzi/ui-kit/backgrounds';

import { Values } from '../../registry';
import { HOME_PHONE_SCENE, HOME_SCENE } from '../../scenes';

/** The catalog's scenes by the name of their constant (scenes.ts), as the usage code writes them. */
const BY_NAME: Readonly<Record<string, LenziScene>> = { HOME_SCENE, HOME_PHONE_SCENE };

/** The scene of the catalog the playground chose, with what the pointer does and whether blobs are thrown. */
export function sceneOf(values: Values): LenziScene {
  const chosen = BY_NAME[String(values['scene'])] ?? HOME_SCENE;
  const follow = String(values['follow'] ?? chosen.follow ?? 'near');
  return {
    ...chosen,
    follow: follow === 'none' || follow === 'target' || follow === 'flee' ? follow : ('near' satisfies BoidsFollow),
    throwable: values['throwable'] === undefined ? chosen.throwable === true : values['throwable'] === true,
  };
}

/** A scene of the catalog behind this frame, a lit card over it. Every parameter is the GUI's. */
@Component({
  selector: 'app-scene-demo',
  imports: [LenziLit, LenziSceneBackground, MatCardModule],
  templateUrl: './scene-demo.html',
  styleUrl: './scene-demo.css',
})
export class SceneDemo {
  readonly values = input<Values>({});

  protected readonly scene = computed(() => sceneOf(this.values()));
}

import { Component, computed, input } from '@angular/core';
import { AmbientLight, DirectionalLight, IcosahedronGeometry, Mesh, MeshStandardMaterial } from 'three';

import { LenziThreeCanvas, LenziThreeSetup } from '@lenzi/ui-kit/three';

import { Values } from '../../registry';

/** An icosahedron in a theme colour, turning: the scene is the page's, the canvas owns the rest. */
@Component({
  selector: 'app-three-canvas-demo',
  imports: [LenziThreeCanvas],
  templateUrl: './three-canvas-demo.html',
  styleUrl: './three-canvas-demo.css',
})
export class ThreeCanvasDemo {
  readonly values = input<Values>({});

  protected readonly animate = computed(() => this.values()['animate'] !== false);
  protected readonly speed = computed(() => Number(this.values()['speed'] ?? 0.6));

  /** A new setup when the shape changes (detail, colour, wireframe); the speed is read at every frame. */
  protected readonly setup = computed<LenziThreeSetup>(() => {
    const detail = Number(this.values()['detail'] ?? 1);
    const wireframe = this.values()['wireframe'] === true;
    const colour = String(this.values()['color'] ?? '--mat-sys-primary');
    return ({ scene, color }) => {
      const shape = new Mesh(new IcosahedronGeometry(1.4, detail), new MeshStandardMaterial({ color: color(colour), wireframe, flatShading: true }));
      const light = new DirectionalLight(0xffffff, 2.4);
      light.position.set(3, 4, 5);
      scene.add(shape, light, new AmbientLight(0xffffff, 0.6));
      return {
        frame: (delta) => {
          shape.rotation.y += delta * this.speed();
          shape.rotation.x += delta * this.speed() * 0.4;
        },
      };
    };
  });
}

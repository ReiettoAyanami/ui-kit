import { CdkDrag } from '@angular/cdk/drag-drop';
import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { LenziBackground, LenziBlobBackground, LenziFlockBackground, LenziGlassSurface, LenziLiquidGlass, LenziSceneBackground } from '@lenzi/ui-kit/backgrounds';

import { Values } from '../../registry';
import { HOME_SCENE } from '../../scenes';

/**
 * Liquid Glass over a background (lenzi, 2026-11-20: "nella pagina del liquid glass nei components per regolare le varie
 * proprietá dello stesso"): a window and a pill of it, both dragged about, every setting of the directive from the
 * parameters. Behind them the home's scene (its boids light the rim as they come near), blobs, a flock or a picture
 * (the hills' lines show the bending best).
 */
@Component({
  selector: 'app-liquid-glass-demo',
  imports: [CdkDrag, LenziBackground, LenziBlobBackground, LenziFlockBackground, LenziLiquidGlass, LenziSceneBackground, MatIconModule],
  templateUrl: './liquid-glass-demo.html',
  styleUrl: './liquid-glass-demo.css',
})
export class LiquidGlassDemo {
  readonly values = input<Values>({});

  protected readonly scene = HOME_SCENE;
  protected readonly behind = computed(() => String(this.values()['behind'] ?? 'scene'));
  protected readonly bezel = computed(() => this.num('bezel', 28));
  protected readonly thickness = computed(() => this.num('thickness', 56));
  protected readonly ior = computed(() => this.num('ior', 1.5));
  protected readonly refraction = computed(() => this.num('refraction', 1));
  protected readonly surface = computed(() => String(this.values()['surface'] ?? 'squircle') as LenziGlassSurface);
  protected readonly blur = computed(() => this.num('blur', 1.5));
  protected readonly saturation = computed(() => this.num('saturation', 1.5));
  protected readonly rim = computed(() => this.num('rim', 0.5));
  protected readonly lightAngle = computed(() => this.num('lightAngle', -60));
  protected readonly rimBoids = computed(() => this.num('rimBoids', 60));
  /**
   * The window's corners. The directive reads them when it draws its maps (on its size or a setting changing), so a new
   * radius is a new window: listed once, by its radius.
   */
  protected readonly radius = computed(() => [this.num('radius', 28)]);

  private num(key: string, otherwise: number): number {
    const value = Number(this.values()[key] ?? otherwise);
    return Number.isFinite(value) ? value : otherwise;
  }
}

import { CdkDrag } from '@angular/cdk/drag-drop';
import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { LenziBackground, LenziBlobBackground, LenziFlockBackground, LenziGlassSurface, LenziLiquidGlass, LenziSceneBackground } from '@lenzi/ui-kit/backgrounds';

import { Values } from '../../registry';
import { HOME_SCENE } from '../../scenes';

/**
 * Liquid Glass over a background (lenzi, 2026-11-20: "nella pagina del liquid glass nei components per regolare le varie
 * proprietá dello stesso"): a window and a pill of it, both dragged about, every setting of the directive from the
 * parameters. Behind them the home's scene (its lights light the edge from under it), blobs, a flock or a picture
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
  protected readonly specularOpacity = computed(() => this.num('specularOpacity', 0.5));
  protected readonly specularSaturation = computed(() => this.num('specularSaturation', 6));
  protected readonly lightReach = computed(() => this.num('lightReach', 12));
  protected readonly lightBase = computed(() => this.num('lightBase', 0.1));
  protected readonly chromaticAberration = computed(() => this.num('chromaticAberration', 0));
  protected readonly brightness = computed(() => this.num('brightness', 0));
  protected readonly distortion = computed(() => this.num('distortion', 0));
  /** The tint the filter draws under its edge (`--lenzi-liquid-fill`, as the app's glass has it). */
  protected readonly fill = computed(() => {
    const tint = this.num('tint', 0);
    return tint > 0 ? `color-mix(in srgb, var(--mat-sys-surface) ${tint}%, transparent)` : null;
  });
  /** Only to try, ybouane's: an app's glass is whole and the kit gives it its shadow. */
  protected readonly opacity = computed(() => this.num('opacity', 1));
  protected readonly shadow = computed(() => {
    const alpha = this.num('shadowOpacity', 0);
    return alpha > 0 ? `0 ${this.num('shadowOffsetY', 1)}px ${this.num('shadowSpread', 10) * 2}px rgb(0 0 0 / ${alpha})` : null;
  });
  /** The window's corners: the directive follows them (it looks at them about twice a second). */
  protected readonly radius = computed(() => this.num('radius', 28));

  private num(key: string, otherwise: number): number {
    const value = Number(this.values()[key] ?? otherwise);
    return Number.isFinite(value) ? value : otherwise;
  }
}

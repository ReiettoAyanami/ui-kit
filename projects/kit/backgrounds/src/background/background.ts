import { Component, computed, input, numberAttribute } from '@angular/core';

import { LenziBackgroundFill } from '../glow-background/glow-background';

/** A CSS variable (`--mat-sys-surface`) as its `var()`, any other colour as it is. */
const cssColour = (colour: string) => (colour.trim().startsWith('--') ? `var(${colour.trim()})` : colour);

/**
 * A plain background (lenzi, 2026-11-13: "normal (color, photo, ecc)"): a solid colour, and over it
 * a gradient, a photo, or both, behind the whole page or behind the box it is in. Only CSS: nothing
 * moves, nothing is drawn by the GPU. `dim` lays the colour back over the picture so the page stays
 * readable; `blur` blurs the picture, like every background's. A background is decoration: screen
 * readers do not see it, and it never takes a click.
 */
@Component({
  selector: 'lenzi-background',
  imports: [],
  templateUrl: './background.html',
  styleUrl: './background.css',
  host: {
    class: 'lenzi-plain-background',
    'aria-hidden': 'true',
    '[class.lenzi-background-box]': "fill() === 'box'",
    '[style.background-color]': 'colour()',
  },
})
export class LenziBackground {
  /** Behind the whole page (fixed to the window), or behind the box it is in. */
  readonly fill = input<LenziBackgroundFill>('page');
  /** The solid colour: a CSS variable (`'--mat-sys-surface'`) or any CSS colour. */
  readonly color = input('--mat-sys-surface');
  /** A gradient over the colour: any CSS image (`'linear-gradient(…)'`), in the theme's variables. */
  readonly gradient = input('');
  /** A photo's address, under the gradient. */
  readonly image = input('');
  /** How the photo fills the space: covering it, whole inside it, or repeated. */
  readonly fit = input<'cover' | 'contain' | 'tile'>('cover');
  /** Which part of the photo stays in view (CSS `background-position`). */
  readonly position = input('center');
  /** How much of the colour is laid back over the picture, 0 (none) to 1 (only the colour). */
  readonly dim = input(0, { transform: numberAttribute });
  /** A blur over the picture, in px: 0 none. */
  readonly blur = input(0, { transform: numberAttribute });

  protected readonly colour = computed(() => cssColour(this.color()));

  /** The gradient over the photo, as one CSS background; null with neither. */
  protected readonly picture = computed(() => {
    const address = this.image().trim().replace(/["\\\n]/g, (character) => encodeURIComponent(character));
    const layers = [this.gradient().trim(), address ? `url("${address}")` : ''];
    return layers.filter(Boolean).join(', ') || null;
  });
}

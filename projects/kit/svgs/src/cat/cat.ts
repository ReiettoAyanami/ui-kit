import { Component, computed, input, numberAttribute } from '@angular/core';

import { LenziGlow, LenziLit, LenziSolid } from '@lenzi/ui-kit/backgrounds';

import { CAT_ASPECT, CAT_FACES, CAT_SHAPES, CAT_VIEW_BOX, CatShape } from './cat-art';

/** How it looks: three faces, from behind, from behind with a hard hat (work in progress). */
export type LenziCatMood = 'happy' | 'sleepy' | 'sad' | 'back' | 'builder';

/** What it is made of: the theme's surface, or one of the kit's materials. */
export type LenziCatMaterial = 'plain' | 'glass' | 'lamp' | 'solid';

/** The shape the material takes: what the cat's outline encloses, as a mask. */
const maskOf = (shape: CatShape) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='${CAT_VIEW_BOX}' preserveAspectRatio='none'><path fill-rule='evenodd' d='${shape.silhouette}'/></svg>`)}")`;
const MASKS = { body: maskOf(CAT_SHAPES.body), builder: maskOf(CAT_SHAPES.builder) };

/**
 * lenzi's cat (2026-11-14: "prendi i png ... trasformali in svg e fammi una pagina dove posso vedere gli
 * effetti dei materiali sulle varie icone. Se riesci animalo un pochetto"): the drawing, traced into vectors,
 * in the theme's colours. Its body takes a material, shaped as the cat (not as a box): the page's
 * surface, glass (`lenziLit`), a lamp (`lenziGlow`: it lights what is around it) or solid (`lenziSolid`: it
 * casts the cat's shadow). It breathes, blinks and twitches its whiskers, a little (not with reduced motion).
 */
@Component({
  selector: 'lenzi-cat',
  imports: [LenziGlow, LenziLit, LenziSolid],
  templateUrl: './cat.html',
  styleUrl: './cat.css',
  host: {
    class: 'lenzi-cat',
    '[style.width.px]': 'size()',
    '[style.--lenzi-cat-aspect]': 'aspect',
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': "label() ? null : 'true'",
  },
})
export class LenziCat {
  readonly mood = input<LenziCatMood>('happy');
  readonly material = input<LenziCatMaterial>('plain');
  /** Its width, px; its height follows the drawing. */
  readonly size = input(96, { transform: numberAttribute });
  /** Breathing, blinking, twitching its whiskers. */
  readonly animated = input(true);
  /** What it says to a screen reader; nothing: it is decoration. */
  readonly label = input('');
  /** A lamp's colour (any CSS colour, or a variable's name), how bright (0 to 2) and how far it shines, px. */
  readonly glowColor = input('--mat-sys-primary');
  readonly glowStrength = input(1, { transform: numberAttribute });
  readonly glowReach = input(220, { transform: numberAttribute });

  protected readonly viewBox = CAT_VIEW_BOX;
  protected readonly aspect = CAT_ASPECT;
  protected readonly shape = computed(() => CAT_SHAPES[this.mood() === 'builder' ? 'builder' : 'body']);
  protected readonly mask = computed(() => MASKS[this.mood() === 'builder' ? 'builder' : 'body']);
  protected readonly face = computed(() => {
    const mood = this.mood();
    return mood === 'happy' || mood === 'sleepy' || mood === 'sad' ? CAT_FACES[mood] : null;
  });
  /** A lamp's colour as CSS (a variable's name as its var()). */
  protected readonly lampColor = computed(() => {
    const color = this.glowColor().trim();
    return color.startsWith('--') ? `var(${color})` : color;
  });
}

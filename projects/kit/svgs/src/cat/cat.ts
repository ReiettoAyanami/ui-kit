import { Component, computed, input, numberAttribute } from '@angular/core';

import { LenziGlow, LenziLit, LenziSolid } from '@lenzi/ui-kit/backgrounds';

import { CAT_ASPECT, CAT_BACKS, CAT_EXPRESSIONS, CAT_VIEW_BOX, CatShape } from './cat-art';

/** Its face: three expressions, or none (seen from behind). */
export type LenziCatExpression = 'happy' | 'sleepy' | 'sad' | 'none';

/** Its back: plain, or with a hard hat (something being built). */
export type LenziCatBack = 'plain' | 'hard-hat';

/** What it is made of: the theme's surface, or one of the kit's materials. */
export type LenziCatMaterial = 'plain' | 'glass' | 'lamp' | 'solid';

/** The shape the material takes: what the cat's outline encloses, as a mask. */
const maskOf = (shape: CatShape) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='${CAT_VIEW_BOX}' preserveAspectRatio='none'><path fill-rule='evenodd' d='${shape.silhouette}'/></svg>`)}")`;
const MASKS = { plain: maskOf(CAT_BACKS.plain), 'hard-hat': maskOf(CAT_BACKS['hard-hat']) };

/**
 * lenzi's cat (2026-11-14: "prendi i png ... trasformali in svg e fammi una pagina dove posso vedere gli
 * effetti dei materiali sulle varie icone. Se riesci animalo un pochetto"): the drawing, traced into vectors,
 * in the theme's colours. An expression over a back ("make me choose what expression and what back to
 * use"). Its body takes a material, shaped as the cat (not as a box): the page's surface, glass
 * (`lenziLit`), a lamp (`lenziGlow`: it lights what is around it) or solid (`lenziSolid`: it casts the cat's
 * shadow). It breathes, blinks and twitches its whiskers, a little (not with reduced motion).
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
  readonly expression = input<LenziCatExpression>('happy');
  readonly back = input<LenziCatBack>('plain');
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
  protected readonly shape = computed(() => CAT_BACKS[this.back()] ?? CAT_BACKS.plain);
  protected readonly mask = computed(() => MASKS[this.back()] ?? MASKS.plain);
  protected readonly face = computed(() => {
    const expression = this.expression();
    return expression === 'none' ? null : (CAT_EXPRESSIONS[expression] ?? null);
  });
  /** A lamp's colour as CSS (a variable's name as its var()). */
  protected readonly lampColor = computed(() => {
    const color = this.glowColor().trim();
    return color.startsWith('--') ? `var(${color})` : color;
  });
}

import { Component, DOCUMENT, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, input, numberAttribute, signal, viewChild } from '@angular/core';

import { LenziGlow, LenziLit, LenziPoint, LenziSights, LenziSolid } from '@lenzi/ui-kit/backgrounds';

import { CAT_ASPECT, CAT_BACKS, CAT_EXPRESSIONS, CAT_VIEW_BOX, CatShape } from './cat-art';

/**
 * Its face: three expressions; watching (open eyes whose pupils follow the pointer, or what moves on the
 * page when the pointer is not there); or none (seen from behind).
 */
export type LenziCatExpression = 'happy' | 'sleepy' | 'sad' | 'watching' | 'none';

/** The middle of a path's points, in the drawing's units. */
function middleOf(d: string): { x: number; y: number } {
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const box = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    box.left = Math.min(box.left, numbers[i]!);
    box.right = Math.max(box.right, numbers[i]!);
    box.top = Math.min(box.top, numbers[i + 1]!);
    box.bottom = Math.max(box.bottom, numbers[i + 1]!);
  }
  return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
}

/** Between the eyes, in the drawing's units. */
const LEFT_EYE = middleOf(CAT_EXPRESSIONS.happy.eyeLeft);
const RIGHT_EYE = middleOf(CAT_EXPRESSIONS.happy.eyeRight);
const BETWEEN_EYES = { x: (LEFT_EYE.x + RIGHT_EYE.x) / 2, y: (LEFT_EYE.y + RIGHT_EYE.y) / 2 };
/** How far the eyes move towards what it looks at, in the drawing's units (an eye is about 130 × 220). */
const EYE_TRAVEL = { x: 34, y: 26 };
/** How far the rest of the face (mouth, whiskers) follows them, in the same units. */
const FACE_TRAVEL = { x: 12, y: 9 };
/** How far away, as widths of the cat, something is for the pupils to go all the way to that side. */
const FAR = 1.4;
/** The drawing's width, in its own units. */
const DRAWING_WIDTH = Number(CAT_VIEW_BOX.split(' ')[2]);

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
 * use"); watching, its eyes follow the pointer ("make it so that it follows the mouse cursor with the eyes
 * a bit"), and the nearest boid of a flock on the page when the pointer is not there. Its body takes a material, shaped as the cat (not as a box): the page's surface, glass
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
  /**
   * A lamp's colour drifts slowly round its own, by this many degrees of hue each way (lenzi, 2026-11-14:
   * "fallo luminoso che cambia leggermente il colore nel tempo come i blob"); 0: it stays. Not with reduced motion.
   */
  readonly drift = input(0, { transform: numberAttribute });

  /** Where the drift is now, -1..1. */
  private readonly swing = signal(0);

  protected readonly viewBox = CAT_VIEW_BOX;
  protected readonly aspect = CAT_ASPECT;
  protected readonly shape = computed(() => CAT_BACKS[this.back()] ?? CAT_BACKS.plain);
  protected readonly mask = computed(() => MASKS[this.back()] ?? MASKS.plain);
  protected readonly face = computed(() => {
    const expression = this.expression();
    if (expression === 'none') return null;
    // watching: the happy face's open eyes, with pupils
    return CAT_EXPRESSIONS[expression === 'watching' ? 'happy' : expression] ?? null;
  });
  protected readonly watching = computed(() => this.expression() === 'watching');

  private readonly ink = viewChild<ElementRef<SVGSVGElement>>('ink');
  private readonly faceGroup = viewChild<ElementRef<SVGGElement>>('faceGroup');
  private readonly eyeLeft = viewChild<ElementRef<SVGGElement>>('eyeLeft');
  private readonly eyeRight = viewChild<ElementRef<SVGGElement>>('eyeRight');

  constructor() {
    const document = inject(DOCUMENT);
    const sights = inject(LenziSights);
    const view = document.defaultView;
    let pointer: LenziPoint | null = null;
    let frame: number | null = null;
    let last = 0;
    // where the eyes look now, -1..1 each way
    const look = { x: 0, y: 0 };
    const place = (element: SVGGElement | undefined, x: number, y: number) =>
      x === 0 && y === 0 ? element?.removeAttribute('transform') : element?.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);

    const onPointer = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
    };
    const onPointerGone = (event: PointerEvent) => {
      if (event.type === 'pointerout' ? event.relatedTarget === null : event.pointerType !== 'mouse') pointer = null;
    };

    const tick = (now: number) => {
      frame = null;
      if (!this.watching()) return;
      const svg = this.ink()?.nativeElement;
      // not drawn yet: the next frame
      if (!svg) {
        frame = view?.requestAnimationFrame(tick) ?? null;
        return;
      }
      const box = svg.getBoundingClientRect();
      const scale = box.width / DRAWING_WIDTH;
      // between the eyes, on the screen
      const middle = { x: box.left + BETWEEN_EYES.x * scale, y: box.top + BETWEEN_EYES.y * scale };
      // the pointer, or else the nearest thing that moves (a flock's boid), or else straight ahead
      const target = pointer ?? sights.nearest(middle);
      let goal = { x: 0, y: 0 };
      if (target) {
        const dx = target.x - middle.x;
        const dy = target.y - middle.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 1) {
          const reach = Math.min(1, distance / (box.width * FAR));
          goal = { x: (dx / distance) * reach, y: (dy / distance) * reach };
        }
      }
      const still = view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      const step = still ? 1 : 1 - Math.exp(-Math.max(0, now - last) / 120);
      last = now;
      look.x += (goal.x - look.x) * step;
      look.y += (goal.y - look.y) * step;
      // the eyes move more than the face around them: they turn, the head only leans
      const eyes = { x: look.x * (EYE_TRAVEL.x - FACE_TRAVEL.x), y: look.y * (EYE_TRAVEL.y - FACE_TRAVEL.y) };
      place(this.eyeLeft()?.nativeElement, eyes.x, eyes.y);
      place(this.eyeRight()?.nativeElement, eyes.x, eyes.y);
      place(this.faceGroup()?.nativeElement, look.x * FACE_TRAVEL.x, look.y * FACE_TRAVEL.y);
      frame = view?.requestAnimationFrame(tick) ?? null;
    };

    afterNextRender(() => {
      if (!view) return;
      view.addEventListener('pointermove', onPointer, { passive: true });
      view.addEventListener('pointerdown', onPointer, { passive: true });
      view.addEventListener('pointerup', onPointerGone, { passive: true });
      view.addEventListener('pointercancel', onPointerGone, { passive: true });
      document.addEventListener('pointerout', onPointerGone, { passive: true });
    });
    // a lamp whose colour drifts: two slow waves, never quite in step (as the blobs wander)
    let drifting: ReturnType<typeof setInterval> | null = null;
    effect(() => {
      const wanted = this.drift() > 0 && this.material() === 'lamp' && !(view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
      if (wanted && drifting === null && view) {
        const start = view.performance.now();
        drifting = setInterval(() => {
          const t = (view.performance.now() - start) / 1000;
          this.swing.set(0.7 * Math.sin((t * 2 * Math.PI) / 14) + 0.3 * Math.sin((t * 2 * Math.PI) / 37 + 1.3));
        }, 100);
      } else if (!wanted && drifting !== null) {
        clearInterval(drifting);
        drifting = null;
        this.swing.set(0);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      if (drifting !== null) clearInterval(drifting);
    });

    // the eyes move only while it watches
    effect(() => {
      if (!view?.requestAnimationFrame) return;
      if (this.watching()) {
        if (frame === null) {
          last = view.performance.now();
          frame = view.requestAnimationFrame(tick);
        }
      } else {
        look.x = look.y = 0;
        for (const element of [this.faceGroup(), this.eyeLeft(), this.eyeRight()]) element?.nativeElement.removeAttribute('transform');
      }
    });
    inject(DestroyRef).onDestroy(() => {
      if (frame !== null) view?.cancelAnimationFrame(frame);
      view?.removeEventListener('pointermove', onPointer);
      view?.removeEventListener('pointerdown', onPointer);
      view?.removeEventListener('pointerup', onPointerGone);
      view?.removeEventListener('pointercancel', onPointerGone);
      document.removeEventListener('pointerout', onPointerGone);
    });
  }
  /** A lamp's colour as CSS (a variable's name as its var()), its hue turned by the drift of now. */
  protected readonly lampColor = computed(() => {
    const raw = this.glowColor().trim();
    const color = raw.startsWith('--') ? `var(${raw})` : raw;
    const turn = Math.round(this.drift() * this.swing() * 10) / 10;
    return turn === 0 ? color : `oklch(from ${color} l c calc(h + ${turn}))`;
  });
}

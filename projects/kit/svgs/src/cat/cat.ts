import { Component, DOCUMENT, DestroyRef, ElementRef, afterNextRender, booleanAttribute, computed, effect, inject, input, numberAttribute, signal, viewChild } from '@angular/core';

import { LenziGlow, LenziLit, LenziPoint, LenziSights, LenziSolid } from '@lenzi/ui-kit/backgrounds';

import { CAT_ASPECT, CAT_BACKS, CAT_EXPRESSIONS, CAT_EYE_EDGES, CAT_VIEW_BOX, CatEyeEdges, CatShape } from './cat-art';

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
/**
 * The happy mouth (an ω, "il 3") opened (lenzi, 2026-11-14: "fagli aprire la bocca aggiungendo una v tra il
 * 3"): a V hanging from the bottom of its two bowls, drawn as a line as wide as the drawing's. Its points, in
 * the drawing's units, read from the mouth's outline.
 */
function openMouth(mouth: string): { d: string; width: number } {
  const points = outlinePoints(mouth);
  const left = Math.min(...points.map(([x]) => x));
  const right = Math.max(...points.map(([x]) => x));
  const middle = (left + right) / 2;
  /**
   * The middle of the ω's line at the bottom of a bowl, and how thick the line is there: under the outline's
   * lowest point, from its bottom edge up to its top edge.
   */
  const bowl = (from: number, to: number) => {
    const low = points.filter(([x]) => x >= from && x <= to).reduce((a, p) => (p[1] > a[1] ? p : a));
    const column = points.filter(([x, y]) => Math.abs(x - low[0]) < 4 && y > low[1] - 60).map(([, y]) => y);
    const top = Math.min(...column);
    return { x: low[0], y: (low[1] + top) / 2, thick: low[1] - top };
  };
  const a = bowl(left, middle - (right - left) * 0.1);
  const b = bowl(middle + (right - left) * 0.1, right);
  // a little lighter than the ω (2026-11-14: "linea leggermente meno pesante sulla v"), its ends inside the
  // ω's line, so it grows out of it with no seam ("si vede che l'hai attaccata dopo")
  const width = Math.min(a.thick, b.thick) * 0.72;
  // deep enough that the mouth reads open, not a dot under the ω
  const depth = (b.x - a.x) * 0.95;
  const tip = { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + depth };
  return { d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${tip.x.toFixed(1)} ${tip.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`, width };
}

/** A path's outline as points: its lines' ends, and its curves sampled (absolute M, L, C, as potrace writes them). */
function outlinePoints(d: string): [number, number][] {
  const tokens = d.match(/[MLCZ]|-?\d+(?:\.\d+)?/g) ?? [];
  const points: [number, number][] = [];
  let command = '';
  let at: [number, number] = [0, 0];
  for (let i = 0; i < tokens.length; ) {
    if (/[MLCZ]/.test(tokens[i]!)) command = tokens[i++]!;
    if (command === 'Z') continue;
    if (command === 'C') {
      const [x1, y1, x2, y2, x, y] = tokens.slice(i, i + 6).map(Number) as [number, number, number, number, number, number];
      i += 6;
      for (let s = 1; s <= 12; s++) {
        const t = s / 12;
        const u = 1 - t;
        points.push([u * u * u * at[0] + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x, u * u * u * at[1] + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y]);
      }
      at = [x, y];
    } else {
      at = [Number(tokens[i]), Number(tokens[i + 1])];
      i += 2;
      points.push(at);
    }
  }
  return points;
}

const OPEN_MOUTH = openMouth(CAT_EXPRESSIONS.happy.mouth);

/** How long the eyes take to close into a U, or to open, ms. */
const LID_TIME = 420;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * An open eye closing (lenzi, 2026-11-14: "fai chiudere gli occhi in una specie di U"), `t` 0 (open) to 1
 * (shut): its top edges come down onto the inner bottom edge, so the hole closes and the ring's lower stroke
 * is left, a U. Two outlines, filled even-odd.
 */
export function closingEye(edges: CatEyeEdges, t: number): string {
  const lower = (from: readonly number[]) => from.map((value, i) => value + (edges.innerBottom[i]! - value) * t);
  const point = (line: readonly number[], i: number): [number, number] => [line[i * 2]!, line[i * 2 + 1]!];
  /**
   * A round end from one point to another (lenzi, 2026-11-14: "questi devono essere arrotondati": the U's
   * tips were cut straight across), bulging away from `inside` (a point of the stroke).
   */
  const cap = (from: [number, number], to: [number, number], inside: [number, number]) => {
    const cx = (from[0] + to[0]) / 2;
    const cy = (from[1] + to[1]) / 2;
    const r = Math.hypot(to[0] - from[0], to[1] - from[1]) / 2;
    if (r < 0.5) return '';
    const start = Math.atan2(from[1] - cy, from[0] - cx);
    // the half turn that goes round the side away from the stroke
    const mid = start + Math.PI / 2;
    const away = (Math.cos(mid) * (inside[0] - cx) + Math.sin(mid) * (inside[1] - cy)) < 0 ? 1 : -1;
    let d = '';
    for (let s = 1; s < 8; s++) {
      const angle = start + away * (s / 8) * Math.PI;
      d += `L${(cx + Math.cos(angle) * r).toFixed(1)} ${(cy + Math.sin(angle) * r).toFixed(1)}`;
    }
    return d;
  };
  const outline = (top: readonly number[], bottom: readonly number[], round: boolean) => {
    const last = top.length / 2 - 1;
    let d = `M${top[0]!.toFixed(1)} ${top[1]!.toFixed(1)}`;
    for (let i = 2; i < top.length; i += 2) d += `L${top[i]!.toFixed(1)} ${top[i + 1]!.toFixed(1)}`;
    if (round) d += cap(point(top, last), point(bottom, last), point(bottom, last - 2));
    for (let i = bottom.length - 2; i >= 0; i -= 2) d += `L${bottom[i]!.toFixed(1)} ${bottom[i + 1]!.toFixed(1)}`;
    if (round) d += cap(point(bottom, 0), point(top, 0), point(bottom, 2));
    return `${d}Z`;
  };
  return outline(lower(edges.outerTop), edges.outerBottom, true) + outline(lower(edges.innerTop), edges.innerBottom, false);
}

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

  /**
   * It can be petted (lenzi, 2026-11-14: "i want it to be awake and happy, when you pet him, animate his eyes
   * closing"): a stroke of the pointer over it closes its eyes, content, as a slow blink; they stay closed
   * as long as the pointer is on it, and open the same way when it leaves. It takes no click for it: the
   * window says where the pointer is.
   */
  readonly pettable = input(false, { transform: booleanAttribute });

  /** Being petted now. */
  protected readonly petted = signal(false);

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
  private readonly lidLeft = viewChild<ElementRef<SVGPathElement>>('lidLeft');
  private readonly lidRight = viewChild<ElementRef<SVGPathElement>>('lidRight');
  /** The happy mouth opened, petted: only on the happy faces. */
  protected readonly openMouth = computed(() => (this.pettable() && (this.expression() === 'happy' || this.expression() === 'watching') ? OPEN_MOUTH : null));
  /** The open eyes' edges, for closing them into a U; null for a face without open eyes. */
  private readonly lids = computed(() => {
    const expression = this.expression();
    return expression === 'happy' || expression === 'watching' ? CAT_EYE_EDGES.happy : expression === 'sad' ? CAT_EYE_EDGES.sad : null;
  });

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

    // petting: a stroke over it closes its eyes, and they stay closed as long as the hand is on it; the hand
    // leaving opens them, the same animation the other way (lenzi, 2026-11-14: "Dovresti tenere lo stato di
    // chiuso degli occhi finché ... e poi fare ripartire l'animazione in stato di apertura")
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const stopPetting = () => {
      if (this.petted()) this.petted.set(false);
    };
    const onPointer = (event: PointerEvent) => {
      const moved = pointer ? Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) : 0;
      pointer = { x: event.clientX, y: event.clientY };
      if (!this.pettable()) return;
      const box = host.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) {
        stopPetting();
        return;
      }
      if (moved >= 1 && !this.petted()) this.petted.set(true);
    };
    // the eyes closing into a U and opening again: how closed they are now, 0..1, towards petted or not
    let closed = 0;
    let lidFrame: number | null = null;
    let lidLast = 0;
    const drawLids = () => {
      const lids = this.lids();
      const face = this.face();
      for (const [side, element] of [
        ['left', this.lidLeft()?.nativeElement],
        ['right', this.lidRight()?.nativeElement],
      ] as const) {
        if (!element || !face) continue;
        // open or shut all the way: the drawing as it is
        if (!lids || closed <= 0) element.setAttribute('d', side === 'left' ? face.eyeLeft : face.eyeRight);
        else element.setAttribute('d', closingEye(lids[side], easeInOut(closed)));
      }
    };
    const lidTick = (now: number) => {
      lidFrame = null;
      const target = this.petted() && this.lids() ? 1 : 0;
      const still = view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      const step = still ? 1 : Math.max(0, now - lidLast) / LID_TIME;
      lidLast = now;
      closed = target > closed ? Math.min(target, closed + step) : Math.max(target, closed - step);
      drawLids();
      if (closed !== target && view) lidFrame = view.requestAnimationFrame(lidTick);
    };
    effect(() => {
      this.petted();
      this.lids();
      if (lidFrame !== null || !view?.requestAnimationFrame) return;
      lidLast = view.performance.now();
      lidFrame = view.requestAnimationFrame(lidTick);
    });
    inject(DestroyRef).onDestroy(() => {
      if (lidFrame !== null) view?.cancelAnimationFrame(lidFrame);
    });

    const onPointerGone = (event: PointerEvent) => {
      if (event.type === 'pointerout' ? event.relatedTarget === null : event.pointerType !== 'mouse') {
        pointer = null;
        stopPetting();
      }
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

import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { BLOB_SHAPES, BlobShapeName, shapeRadius } from '../../engine/shapes';
import { LenziLiquidGlassSettings } from '../../liquid-glass/liquid-surface';
import { LENS_BENDING, LENS_SETTINGS, glassLens } from '../lens';

/** A knob's shape: a lying capsule (Apple's), a circle, an upright bar (Android's), or one of the blobs' shapes. */
export type LenziKnobShape = 'capsule' | 'circle' | 'bar' | BlobShapeName;

/**
 * The kit's knobs at rest, px (lenzi, 2026-11-26: "i pomelli più fini, leggermente più larghi della barra che hanno
 * sopra, stessa lunghezza, magari leggermente più corti"): a capsule a little taller than the slider's rail (8 px) and a
 * little shorter than before (38 × 24 then); a blob as round as it is wide.
 */
export const KNOB_SIZES = {
  capsule: { width: 32, height: 14 },
  circle: { width: 18, height: 18 },
  bar: { width: 6, height: 22 },
  blob: { width: 24, height: 24 },
} as const;

/** How much larger than the knob its lens is, held (lenzi, 2026-11-26: "leggermente più grande del pomello magari 25-50%"). */
export const KNOB_GROW = 1.35;

/**
 * The knob's glass: the thumbs' (a dome), gentle on something this small: a dome magnifies all of it, and the browser
 * takes the pixels it bends one by one, so a strong one showed them as steps (lenzi, 2026-11-26: "la risoluzione delle
 * distorsioni si è abbassata notevolmente").
 */
export const KNOB_GLASS: LenziLiquidGlassSettings = { ...LENS_SETTINGS, bezel: 10, thickness: 16, refraction: 0.8, blur: 0, specularOpacity: 0.4, specularSaturation: 7 };

const STEPS = 72;

/** Whether a shape is one of the blobs' (a circle is the kit's own: a round knob). */
export function isBlobShape(shape: LenziKnobShape): shape is BlobShapeName {
  return shape !== 'circle' && shape in BLOB_SHAPES;
}

/**
 * A blob's outline in a box of this size (its widest reach on the box's edge), as a path in px; between two shapes, a
 * share `mix` of the way (their radii mixed: the blobs' own way to turn, it never tears).
 */
export function knobOutline(width: number, height: number, from: BlobShapeName, to: BlobShapeName = from, mix = 0): string {
  const a = BLOB_SHAPES[from];
  const b = BLOB_SHAPES[to];
  const points: string[] = [];
  for (let i = 0; i < STEPS; i++) {
    const angle = (i / STEPS) * Math.PI * 2 - Math.PI / 2;
    const radius = shapeRadius(a, angle) * (1 - mix) + shapeRadius(b, angle) * mix;
    points.push(`${(width / 2 + Math.cos(angle) * radius * (width / 2)).toFixed(2)} ${(height / 2 + Math.sin(angle) * radius * (height / 2)).toFixed(2)}`);
  }
  return `M${points.join('L')}Z`;
}

/**
 * The knob of a control, a piece of its own (lenzi, 2026-11-26: "rendi il pomello la sua entità propria. Permettendo di
 * cambiare la forma nelle forme dei blob per esempio, permettendo di animare"): white at rest, any shape (a capsule, a
 * circle, a bar, a blob's; a blob may turn from shape to shape, `morph`); held, it grows into a lens of Liquid Glass
 * a little larger than itself (`grow`, 1.35: "25-50% ... qualcosa di non troppo grande"), gradually (`growDuration`,
 * `growEasing`), and its glass takes the shape it had then. Let go, it shrinks back white. Its control places it and
 * says when it is held (`held`); `<lenzi-glass-slider>` takes one as its content, or makes its own.
 */
@Component({
  selector: 'lenzi-glass-knob',
  imports: [],
  templateUrl: './glass-knob.html',
  styleUrl: './glass-knob.css',
  host: {
    class: 'lenzi-glass-knob',
    '[class.held]': 'held()',
    '[class.focused]': 'focused()',
    '[class]': '"shape-" + kind()',
    '[style.--knob-width.px]': 'size().width',
    '[style.--knob-height.px]': 'size().height',
    '[style.--knob-lens-width.px]': 'lensSize().width',
    '[style.--knob-lens-height.px]': 'lensSize().height',
    '[style.--knob-grow]': 'growth()',
    '[style.--knob-grow-duration.ms]': 'growDuration()',
    '[style.--knob-grow-easing]': 'growEasing()',
    '[style.--knob-lens-radius]': 'lensRadius()',
  },
})
export class LenziGlassKnob {
  /** Its shape at rest. */
  readonly shape = input<LenziKnobShape>('capsule');
  /** Its glass's shape, held; the one it has then by default. */
  readonly lensShape = input<LenziKnobShape | null>(null);
  /** Its size at rest, px; the kit's for its shape by default (KNOB_SIZES). */
  readonly width = input<number | null, unknown>(null, { transform: (v: unknown) => (v === null || v === undefined || v === '' ? null : numberAttribute(v)) });
  readonly height = input<number | null, unknown>(null, { transform: (v: unknown) => (v === null || v === undefined || v === '' ? null : numberAttribute(v)) });
  /** How much larger its lens is than itself, held: 1.25 to 1.5 in the kit. */
  readonly grow = input(KNOB_GROW, { transform: numberAttribute });
  /** How long it takes to grow into its lens, and to shrink back, ms. */
  readonly growDuration = input(240, { transform: numberAttribute });
  /** How it grows (a CSS easing): a little past, then back, by default. */
  readonly growEasing = input('cubic-bezier(0.3, 1.35, 0.6, 1)');
  /** The blobs' shapes it turns through at rest, one after the other, round (a blob knob; none: still). */
  readonly morph = input<readonly BlobShapeName[]>([]);
  /** How long it stays on its way from one shape to the next, ms. */
  readonly morphDuration = input(1600, { transform: numberAttribute });

  /** Held by its control: it is glass. */
  readonly held = signal(false);
  /** Its control has the keyboard's focus: it shows the ring. */
  readonly focused = signal(false);

  protected readonly kind = computed(() => (isBlobShape(this.shape()) ? 'blob' : this.shape()));
  readonly size = computed(() => {
    const shape = this.shape();
    const base = KNOB_SIZES[isBlobShape(shape) ? 'blob' : shape];
    return { width: this.width() ?? base.width, height: this.height() ?? base.height };
  });
  protected readonly growth = computed(() => Math.min(2, Math.max(1, this.grow())));
  /** Its lens's size, px: what its control leaves room for. */
  readonly lensSize = computed(() => ({ width: Math.round(this.size().width * this.growth()), height: Math.round(this.size().height * this.growth()) }));
  /** The lens's shape (its own, or the knob's). */
  private readonly lensKind = computed(() => this.lensShape() ?? this.shape());
  protected readonly lensRadius = computed(() => {
    const { width, height } = this.lensSize();
    const shape = this.lensKind();
    return shape === 'circle' ? '50%' : shape === 'bar' ? `${Math.min(width, height) / 4}px` : `${Math.min(width, height) / 2}px`;
  });
  /** The blob's outline now, px, at rest (it turns, `morph`). */
  protected readonly outline = signal('');
  /** The lens's outline, frozen when it is held (a blob's), in its own px. */
  private lensPath: string | null = null;

  private readonly glass = viewChild.required<ElementRef<HTMLElement>>('glass');
  private readonly lens = glassLens(
    () => this.glass().nativeElement,
    () => ({ ...KNOB_GLASS, glassPath: this.lensPath, glassViewBox: `0 0 ${this.lensSize().width} ${this.lensSize().height}` }),
    LENS_BENDING.held,
  );
  /** Where the morph is: which shape, and how far to the next. */
  private shown: { from: BlobShapeName; to: BlobShapeName; mix: number } | null = null;

  /**
   * The lens in a blob's shape, a share of the way between two: its outline exact (its clip), its bending the nearest of
   * four steps (a filter only when the step changes; its maps kept).
   */
  private shapeLens(at: { from: BlobShapeName; to: BlobShapeName; mix: number }): void {
    const { width, height } = this.lensSize();
    this.glass().nativeElement.style.clipPath = `path('${knobOutline(width, height, at.from, at.to, at.mix)}')`;
    const step = knobOutline(width, height, at.from, at.to, Math.round(at.mix * 4) / 4);
    if (step === this.lensPath) return;
    this.lensPath = step;
    this.lens.refresh();
  }

  constructor() {
    const document = inject(DOCUMENT);
    const view = document.defaultView;
    const still = !!view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // The blob's outline: still, or turning from shape to shape, at rest and held alike (lenzi, 2026-11-26: "la forma non
    // cambia quando dragghi"). Held, the lens's outline follows it at every frame (its clip), and its bending in four steps
    // a turn (each step's maps made once and decoded before it is shown: a glass drawn again never flickers).
    let frame: number | null = null;
    let started = 0;
    const draw = (now: number) => {
      frame = null;
      const shape = this.shape();
      if (!isBlobShape(shape)) return;
      const shapes = [shape, ...this.morph().filter((s) => s !== shape && s in BLOB_SHAPES)];
      const { width, height } = this.size();
      const turning = shapes.length >= 2 && !still;
      if (!turning) {
        this.shown = { from: shape, to: shape, mix: 0 };
      } else {
        const duration = Math.max(200, this.morphDuration());
        const at = (now - started) / duration;
        const i = Math.floor(at) % shapes.length;
        const f = at - Math.floor(at);
        // each shape holds a while, then turns into the next (smoothly)
        const turn = Math.min(1, Math.max(0, (f - 0.45) / 0.55));
        this.shown = { from: shapes[i]!, to: shapes[(i + 1) % shapes.length]!, mix: turn * turn * (3 - 2 * turn) };
      }
      this.outline.set(knobOutline(width, height, this.shown.from, this.shown.to, this.shown.mix));
      if (this.held() && this.lensShape() === null) this.shapeLens(this.shown);
      if (turning) frame = view?.requestAnimationFrame(draw) ?? null;
    };
    effect(() => {
      void [this.shape(), this.morph(), this.size(), this.lensShape()];
      untracked(() => {
        if (frame !== null) view?.cancelAnimationFrame(frame);
        const now = view?.performance.now() ?? 0;
        started = started || now;
        // drawn now (its first outline at once), then at every frame while it turns
        draw(now);
      });
    });
    // held: the lens takes the knob's shape now (or its own), then grows; its size never moves (RULES.md)
    effect(() => {
      const held = this.held();
      untracked(() => {
        if (!held) return;
        const lens = this.lensKind();
        if (isBlobShape(lens)) this.shapeLens(this.lensShape() === null && this.shown ? this.shown : { from: lens, to: lens, mix: 0 });
        else {
          this.lensPath = null;
          this.glass().nativeElement.style.clipPath = '';
          this.lens.refresh();
        }
      });
    });
    inject(DestroyRef).onDestroy(() => frame !== null && view?.cancelAnimationFrame(frame));
  }
}

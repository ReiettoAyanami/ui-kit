import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';

import { LENS_BENDING, LENS_SETTINGS, glassLens } from '../lens';
import { LenziLiquidGlassSettings } from '../../liquid-glass/liquid-surface';

/** One entry of a glass list. */
export interface LenziGlassListItem {
  /** Whole words. */
  name: string;
  /** A line under the name (hidden where the list is a row). */
  caption?: string | null;
}

/** How long the lens stays clear glass on its way to another entry, ms. */
const SETTLE = 420;

/**
 * The lens's glass: the thumbs' (`LENS_SETTINGS`), a little gentler on something this large (an entry is 200 px wide):
 * the bending at its edge, the words in its middle flat and sharp.
 */
export const GLASS_LIST_LENS: LenziLiquidGlassSettings = {
  ...LENS_SETTINGS,
  bezel: 14,
  thickness: 32,
  refraction: 1.2,
};

/**
 * A list of what a panel beside it shows, one chosen (lenzi, 2026-11-26, the showcase's list: "Questa mettila nelle
 * componenti e fai in modo che l'highlight della selezione sia una lente di liquid glass bianchina/violacea"): the chosen
 * entry under a lens of Liquid Glass, milky white and violet; a tap on another, or the arrow keys, slide the lens there,
 * clear glass on its way and milky again when it settles, as the kit's segmented control, but always under the words
 * (over them, its bezel made them flicker as it slid). Its size is taken at once, only its place slides (a size that
 * moves makes a new filter at every frame: it flickered too). A column, or a row where its place says so (`--lenzi-glass-list-direction`). Tabs for a screen
 * reader. Under the chosen entry's words, what the app gives (`extra`: the showcase's clock).
 */
@Component({
  selector: 'lenzi-glass-list',
  imports: [NgTemplateOutlet],
  templateUrl: './glass-list.html',
  styleUrl: './glass-list.css',
  host: { class: 'lenzi-glass-list' },
})
export class LenziGlassList {
  readonly items = input.required<readonly LenziGlassListItem[]>();
  /** What the list is, for a screen reader. */
  readonly label = input.required<string>();
  /** The chosen entry's index: `[(selected)]`. */
  readonly selected = model(0);
  /** Shown under the chosen entry's words, given its index (a bar that fills, a count). */
  readonly extra = input<TemplateRef<{ $implicit: number }> | null>(null);

  /** The chosen index, kept inside the entries there are. */
  protected readonly current = computed(() => {
    const count = this.items().length;
    return count ? ((Math.round(this.selected()) % count) + count) % count : 0;
  });
  /** On its way: the lens is clear glass. */
  protected readonly moving = signal(false);
  /** Where the lens is: the chosen entry's box in the list, px. */
  protected readonly box = signal<{ x: number; y: number; width: number; height: number } | null>(null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly entries = viewChildren<ElementRef<HTMLElement>>('entry');
  private readonly lens = viewChild.required<ElementRef<HTMLElement>>('lens');
  private settle: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const glass = glassLens(() => this.lens().nativeElement, GLASS_LIST_LENS, LENS_BENDING.rest);
    effect(() => glass.bending(this.moving() ? LENS_BENDING.held : LENS_BENDING.rest));
    // the lens follows the chosen entry, measured: again when the entries or the list change size (a row on a phone, a
    // caption that wraps)
    effect(() => {
      void [this.current(), this.entries()];
      untracked(() => this.measure());
    });
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      this.measure();
      if (typeof ResizeObserver !== 'function') return;
      const observer = new ResizeObserver(() => this.measure());
      observer.observe(this.host);
      for (const entry of this.entries()) observer.observe(entry.nativeElement);
      destroy.onDestroy(() => observer.disconnect());
    });
    destroy.onDestroy(() => this.settle && clearTimeout(this.settle));
  }

  /** Choose an entry (a tap, the keyboard): the lens slides there, glass on its way. */
  choose(index: number): void {
    const count = this.items().length;
    if (!count) return;
    const to = ((index % count) + count) % count;
    if (to === this.current()) return;
    if (this.settle) clearTimeout(this.settle);
    this.moving.set(true);
    this.selected.set(to);
    this.settle = setTimeout(() => this.moving.set(false), SETTLE);
  }

  /** The arrows walk the entries (either way, a column or a row), Home and End go to the ends; the focus follows. */
  protected key(event: KeyboardEvent, index: number): void {
    const count = this.items().length;
    const to = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: count - 1 }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    this.choose(to);
    this.entries()[this.current()]?.nativeElement.focus();
  }

  private measure(): void {
    const entry = this.entries()[this.current()]?.nativeElement;
    if (!entry) return this.box.set(null);
    this.box.set({ x: entry.offsetLeft, y: entry.offsetTop, width: entry.offsetWidth, height: entry.offsetHeight });
  }
}

import { Component, DOCUMENT, DestroyRef, ElementRef, afterNextRender, computed, contentChildren, inject, input, model, numberAttribute, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgTemplateOutlet } from '@angular/common';

import { LenziGlassList, LenziGlassListItem } from '../glass-controls/glass-list/glass-list';
import { LenziShowcaseSlide } from './showcase-slide';

/**
 * A showcase (lenzi, 2026-11-26, choosing proposal F for the catalog's components: "Fai la f, ma nella vetrina ci
 * circolano i pezzi / vari esempi di come utilizzarli"): one large slide at a time, live, and beside it the list of
 * every slide; they take turns by themselves, the list's bar filling while one is on show. Pointed at or focused, it
 * holds; out of sight, or with the tab hidden, it holds; "Pause" stops it, and with reduced motion it starts stopped.
 * The App Store's Today and Apple TV's top shelf. Its slides are `<ng-template lenziShowcaseSlide>`: only the one on
 * show is made.
 */
@Component({
  selector: 'lenzi-showcase',
  imports: [LenziGlassList, MatButtonModule, MatIconModule, NgTemplateOutlet],
  templateUrl: './showcase.html',
  styleUrl: './showcase.css',
  host: {
    class: 'lenzi-surface lenzi-showcase',
    role: 'region',
    'aria-roledescription': 'carousel',
    '[attr.aria-label]': 'label()',
    '[style.--lenzi-showcase-interval]': 'interval() + "ms"',
    '(pointerenter)': 'pointed.set(true)',
    '(pointerleave)': 'pointed.set(false)',
    '(focusin)': 'focused.set(true)',
    '(focusout)': 'leave($event)',
  },
})
export class LenziShowcase {
  /** What it shows, for a screen reader: "Pieces of the kit in use". */
  readonly label = input.required<string>();
  /** How long a slide stays, in milliseconds. */
  readonly interval = input(7000, { transform: numberAttribute });
  /** The slide on show; `[(index)]`. */
  readonly index = model(0);

  protected readonly slides = contentChildren(LenziShowcaseSlide);
  protected readonly current = computed(() => this.slides()[this.shown()] ?? null);
  /** The list's entries: each slide's name and caption. */
  protected readonly entries = computed<LenziGlassListItem[]>(() => this.slides().map((slide) => ({ name: slide.name(), caption: slide.caption() })));
  /** The index, kept inside the slides there are. */
  protected readonly shown = computed(() => {
    const count = this.slides().length;
    return count ? ((Math.round(this.index()) % count) + count) % count : 0;
  });

  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Stopped by its "Pause" (and from the start with reduced motion). */
  readonly paused = signal(this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  protected readonly pointed = signal(false);
  protected readonly focused = signal(false);
  protected readonly inSight = signal(true);
  protected readonly tabShown = signal(true);
  /** The slides take turns now. */
  readonly running = computed(
    () => this.slides().length > 1 && !this.paused() && !this.pointed() && !this.focused() && this.inSight() && this.tabShown(),
  );

  constructor() {
    const destroy = inject(DestroyRef);
    const visibility = () => this.tabShown.set(this.document.visibilityState !== 'hidden');
    this.document.addEventListener('visibilitychange', visibility);
    destroy.onDestroy(() => this.document.removeEventListener('visibilitychange', visibility));
    afterNextRender(() => {
      const View = this.document.defaultView?.IntersectionObserver;
      if (!View) return;
      const observer = new View(([entry]) => this.inSight.set(entry?.isIntersecting ?? true));
      observer.observe(this.host.nativeElement);
      destroy.onDestroy(() => observer.disconnect());
    });
  }

  /** Show a slide (a tap on its name, the keyboard). */
  go(index: number): void {
    const count = this.slides().length;
    if (count) this.index.set(((index % count) + count) % count);
  }

  /** The next slide: its time is up (the bar filled), or asked. */
  next(): void {
    this.go(this.shown() + 1);
  }

  protected toggle(): void {
    this.paused.update((paused) => !paused);
  }

  /** The focus left it, not only moved inside it. */
  protected leave(event: FocusEvent): void {
    if (!this.host.nativeElement.contains(event.relatedTarget as Node | null)) this.focused.set(false);
  }

}

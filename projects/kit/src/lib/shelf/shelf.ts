import { Component, DOCUMENT, DestroyRef, ElementRef, afterNextRender, inject, input, model, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * A shelf (lenzi, 2026-11-26, proposal F for the catalog's components, its shelves from proposal E: "Mi piace la E"):
 * things of one kind in one row that scrolls sideways, under a title and how many they are. The arrows scroll it a
 * row's width at a time, a fade says there is more past an edge; "Show all" lays them all out in a grid instead, "Show
 * fewer" back to the row. The App Store's and Netflix's shelves. Its items are its children, each as wide as
 * `--lenzi-shelf-item`.
 */
@Component({
  selector: 'lenzi-shelf',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './shelf.html',
  styleUrl: './shelf.css',
  host: {
    class: 'lenzi-shelf',
    '[class.lenzi-shelf-expanded]': 'expanded()',
  },
})
export class LenziShelf {
  /** Its title: a category, a kind of thing. */
  readonly title = input.required<string>();
  /** How many things it holds, beside the title; nothing: no number. */
  readonly count = input<number | null>(null);
  /** All of them in a grid instead of a row; `[(expanded)]`. */
  readonly expanded = model(false);

  private readonly row = viewChild.required<ElementRef<HTMLElement>>('row');
  private readonly document = inject(DOCUMENT);
  private readonly destroy = inject(DestroyRef);

  /** Some of it is past the row's start or end. */
  protected readonly before = signal(false);
  protected readonly after = signal(false);

  constructor() {
    afterNextRender(() => {
      const row = this.row().nativeElement;
      this.measure();
      const View = this.document.defaultView?.ResizeObserver;
      if (!View) return;
      const observer = new View(() => this.measure());
      observer.observe(row);
      // its items coming and going (a search) change how much there is
      const mutations = new MutationObserver(() => this.measure());
      mutations.observe(row, { childList: true });
      this.destroy.onDestroy(() => (observer.disconnect(), mutations.disconnect()));
    });
  }

  /** What is past each edge of the row, now. */
  protected measure(): void {
    const row = this.row().nativeElement;
    const end = row.scrollWidth - row.clientWidth;
    this.before.set(!this.expanded() && row.scrollLeft > 1);
    this.after.set(!this.expanded() && row.scrollLeft < end - 1);
  }

  /** A row's width back (-1) or on (1), less a little, so the last one seen stays in sight. */
  scroll(direction: -1 | 1): void {
    const row = this.row().nativeElement;
    const still = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    row.scrollBy({ left: direction * row.clientWidth * 0.85, behavior: still ? 'auto' : 'smooth' });
  }

  protected toggle(): void {
    this.expanded.update((expanded) => !expanded);
    this.row().nativeElement.scrollLeft = 0;
    queueMicrotask(() => this.measure());
  }
}

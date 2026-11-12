import { Component, computed, input, model } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

/** One state of a pill toggle. */
export interface KitPillOption<T> {
  value: T;
  /** The word the pill reads in this state: "price", "qty". */
  label: string;
  /** What a screen reader hears in this state: what it reads, then what a tap does. Default: "<label>. Show <next label>". */
  ariaLabel?: string;
}

/**
 * One pill that reads what the figure beside it shows, and switches it at a tap (substance-tracker
 * `ui/measure-toggle`; lenzi, 2026-10-09: "a toggle on the left for price/qty (pill that changes
 * state not ( 1 | 2 )"). Drawn as the chosen side of a toggle group: 32 px high, round ends,
 * secondary-container. It sits on the left of its figure, which then has no word of its own. Its
 * tap never reaches what is around it (a card that opens its page). Material's least width of a
 * button makes a short word as wide as a longer one, so the figure does not move when it switches.
 * For two or more choices side by side, use a toggle group (mat-button-toggle-group) instead.
 */
@Component({
  selector: 'kit-pill-toggle',
  imports: [MatButtonModule],
  templateUrl: './pill-toggle.html',
  styleUrl: './pill-toggle.css',
})
export class KitPillToggle<T = string> {
  /** The states, in the order a tap walks them (two, usually). */
  readonly options = input.required<readonly KitPillOption<T>[]>();
  /** The state shown; a tap moves it to the next one. */
  readonly value = model.required<T>();

  private readonly index = computed(() => Math.max(0, this.options().findIndex((option) => option.value === this.value())));

  protected readonly current = computed(() => {
    const options = this.options();
    const option = options[this.index()];
    const next = options[(this.index() + 1) % options.length];
    return {
      word: option?.label ?? '',
      label: option?.ariaLabel ?? `${option?.label ?? ''}. Show ${next?.label ?? ''}`,
    };
  });

  protected toggle(event: Event): void {
    event.stopPropagation();
    const options = this.options();
    if (options.length === 0) return;
    this.value.set(options[(this.index() + 1) % options.length]!.value);
  }
}

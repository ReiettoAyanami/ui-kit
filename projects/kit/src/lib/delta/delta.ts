import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Which way a change went: up, down, or neither (no change, or none to show). */
export type LenziDeltaDirection = 'up' | 'down' | null;

/**
 * A change from the one before, as text (substance-tracker `ui/consumption-figures`; lenzi,
 * 2026-10-09): "delta: -33.3%", the word dim, the change in the colour of where it went, after
 * Material's triangle. Which way is good is the page's to say (`good`): normally a rise (the
 * default: up green, down red, lenzi 2026-11-12); for spending, a fall (`good="down"`).
 * No change ("0%") and no change to show ("—", with its reason as a tooltip) are neither colour.
 * The ratio is the API's: the page never computes it.
 */
@Component({
  selector: 'lenzi-delta',
  imports: [MatIconModule],
  templateUrl: './delta.html',
  styleUrl: './delta.css',
})
export class LenziDelta {
  /** The change as the API gives it: "-0.3333" is -33.3%. Null: there is no change to show ("—"). */
  readonly ratio = input.required<string | number | null>();
  /** The word before it. */
  readonly label = input('delta:');
  /** Which way is good: 'up' (the default: a rise is green), 'down' (spending: a fall is green), or 'none' (no colours). */
  readonly good = input<'down' | 'up' | 'none'>('up');
  /** Why there is no change to show: the tooltip of "—". */
  readonly noneReason = input<string | null>(null);
  /** The locale of the percentage. */
  readonly locale = input('en-GB');

  private readonly format = computed(
    () => new Intl.NumberFormat(this.locale(), { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }),
  );

  protected readonly shown = computed(() => {
    const ratio = this.ratio();
    if (ratio === null) return { change: '—', direction: null as LenziDeltaDirection, tone: null as 'good' | 'bad' | null };
    // Intl reads a decimal string as it is: no binary rounding. The direction is the sign shown, so
    // a change too small to show (0%) is neither.
    const parts = this.format().formatToParts(ratio as unknown as number);
    const sign = (type: string) => parts.some((part) => part.type === type);
    const direction: LenziDeltaDirection = sign('plusSign') ? 'up' : sign('minusSign') ? 'down' : null;
    const good = this.good();
    const tone = direction === null || good === 'none' ? null : direction === good ? 'good' : 'bad';
    return { change: parts.map((part) => part.value).join(''), direction, tone };
  });
}

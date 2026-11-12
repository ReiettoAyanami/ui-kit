import { Component, input } from '@angular/core';

/**
 * One figure: what it is on top, bold, and its value under it (RULES.md, "Figures"; lenzi,
 * 2026-10-02: "Voglio cos'è sopra e il valore sotto"; substance-tracker's metrics panel). Never two
 * figures on one line joined by "·". The value comes formatted (the server computes, the page
 * formats); something richer than text (a delta) goes inside it instead. Several figures go in a
 * LenziFigureGrid.
 */
@Component({
  selector: 'lenzi-figure',
  imports: [],
  templateUrl: './figure.html',
  styleUrl: './figure.css',
})
export class LenziFigure {
  /** What it is: "Stock", "Average per day". */
  readonly label = input.required<string>();
  /** The value, formatted: "264 g", "€8.93/g". Null or undefined: "—". */
  readonly value = input<string | number | null | undefined>(undefined);
  /** A sentence under it that explains it (a metric's description), smaller. */
  readonly description = input<string | null>(null);
}

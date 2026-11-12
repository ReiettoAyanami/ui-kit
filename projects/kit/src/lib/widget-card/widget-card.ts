import { Component, input, output } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

/**
 * The card of a chart (substance-tracker `ui/widget`, from lenzi's reference photo, 2026-10-02):
 * almost black on the anthracite page, very round corners, an icon in a round well at its head and a
 * large title; when the chart can be read in several intervals, a toggle of them above it, each card
 * its own (lenzi, 2026-10-01: "ogni card suo toggle"). What it shows goes inside it (a LenziChart, a
 * figure, a message). It loads nothing itself: the page asks and saves.
 */
@Component({
  selector: 'lenzi-widget-card',
  imports: [MatButtonToggleModule, MatCardModule, MatIconModule],
  templateUrl: './widget-card.html',
  styleUrl: './widget-card.css',
})
export class LenziWidgetCard {
  readonly title = input.required<string>();
  /** The icon of what it measures: quantities "inventory_2", counts "numbers", money "payments", prices "sell", hours "schedule". */
  readonly icon = input<string | null>(null);
  /** Under the title: "share of the period". */
  readonly subtitle = input<string | null>(null);
  /** The intervals it can be read in; the toggle shows only with two or more. */
  readonly scales = input<readonly string[]>([]);
  /** The interval it is read in. */
  readonly scale = input<string | null>(null);
  readonly scaleChange = output<string>();
}

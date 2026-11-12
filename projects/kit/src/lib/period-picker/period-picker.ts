import { Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

/** A period offered: the last N days, or all time (0). */
export interface KitPeriod {
  days: number;
  label: string;
}

/** The periods substance-tracker offers: the last 7, 30, 90, 365 days, or all time. */
export const KIT_PERIODS: readonly KitPeriod[] = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
  { days: 365, label: 'Last 365 days' },
  { days: 0, label: 'All time' },
];

/** The scales substance-tracker offers: what rates and durations are read in. */
export const KIT_SCALES: readonly string[] = ['day', 'week', 'month', 'year'];

/** "Last 30 days", "All time"; "Last 14 days" for a period not in the list. */
export function kitPeriodLabel(days: number, periods: readonly KitPeriod[] = KIT_PERIODS): string {
  return periods.find((p) => p.days === days)?.label ?? `Last ${days} days`;
}

/**
 * The two choices of whoever shows figures over time (substance-tracker `ui/period-scale`): the
 * period, and the scale every rate and duration is read in (lenzi: always the user's to choose).
 * Two Material selects; either is left out when its value is null. It keeps no state: the choice
 * goes out, and comes back in. Its fields are items of its host's row (display: contents), so they
 * wrap with the host's other choices.
 */
@Component({
  selector: 'kit-period-picker',
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './period-picker.html',
  styleUrl: './period-picker.css',
})
export class KitPeriodPicker {
  /** The period, in days (0 = all time); null: no period to choose. */
  readonly period = input<number | null>(null);
  /** The scale; null: no scale to choose. */
  readonly scale = input<string | null>(null);
  readonly periods = input<readonly KitPeriod[]>(KIT_PERIODS);
  readonly scales = input<readonly string[]>(KIT_SCALES);
  readonly periodLabel = input('Period');
  readonly scaleLabel = input('Per');
  readonly periodChange = output<number>();
  readonly scaleChange = output<string>();
}

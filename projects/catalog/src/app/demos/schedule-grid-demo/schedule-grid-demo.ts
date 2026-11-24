import { Component, computed, inject, input } from '@angular/core';

import { LenziScheduleDay, LenziScheduleGrid, LenziSchedulePick, LenziScheduleRow, identityColor } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

const PEOPLE = ['Anna', 'Bruno', 'Carla', 'Dario', 'Elena'];
const CODES = ['T1', 'T2', 'T3', 'T4', 'RW'];
const WEEKDAYS = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];

/** A month of shifts: weekends shaded, today the 14th, codes in their identity colours; a tap on a cell says which. */
@Component({
  selector: 'app-schedule-grid-demo',
  imports: [LenziScheduleGrid],
  templateUrl: './schedule-grid-demo.html',
  styleUrl: './schedule-grid-demo.css',
})
export class ScheduleGridDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);

  protected readonly days: LenziScheduleDay[] = Array.from({ length: 31 }, (_, i) => {
    const caption = WEEKDAYS[i % 7]!;
    return {
      key: `2026-01-${String(i + 1).padStart(2, '0')}`,
      label: String(i + 1),
      caption,
      off: caption === 'Sat' || caption === 'Sun' || i === 0,
      today: i === 13,
      title: i === 0 ? "New Year's Day" : undefined,
    };
  });

  protected readonly rows: LenziScheduleRow[] = PEOPLE.map((name, p) => ({
    id: p + 1,
    name,
    color: identityColor(p + 1, 0.5),
    cells: Object.fromEntries(
      this.days
        .filter((day, d) => !day.off && (d + p) % 6 !== 0)
        .map((day, d) => {
          const c = (d + p * 2) % 4;
          const onCall = (d + p) % 5 === 0;
          return [day.key, { text: CODES[c]!, detail: onCall ? 'RS' : null, color: identityColor(c + 1), label: `Shift ${CODES[c]}${onCall ? ', on call RS' : ''}` }];
        }),
    ),
  }));

  protected readonly me = computed(() => (this.values()['highlight'] === false ? null : 2));
  protected readonly editable = computed(() => this.values()['editable'] !== false);

  protected change(pick: LenziSchedulePick): void {
    this.events.log(`${pick.row.name}, ${pick.day.label}: ${pick.cell ? pick.cell.text : 'empty'}`);
  }
}

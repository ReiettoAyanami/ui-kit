import { Component, computed, input, signal } from '@angular/core';

import {
  LenziDelta,
  LenziFigure,
  LenziFigureGrid,
  LenziScheduleDay,
  LenziScheduleGrid,
  LenziScheduleRow,
  LenziSegment,
  LenziSegmentedBar,
  identityColor,
} from '@lenzi/ui-kit';
import { LenziGlassSearch, LenziGlassSegmented, LenziGlassSlider, LenziGlassSwitch } from '@lenzi/ui-kit/backgrounds';

export type UsageKind = 'player' | 'settings' | 'stock' | 'shifts' | 'month' | 'find';

/** A piece of the kit in use, as the components page's showcase shows it: which piece, and what it is an example of. */
export interface UsageExample {
  kind: UsageKind;
  /** The piece's page (registry id). */
  piece: string;
  /** The piece's name, the slide's name. */
  name: string;
  /** What the example is. */
  caption: string;
}

/**
 * The showcase's slides (lenzi, 2026-11-26: "nella vetrina ci circolano i pezzi / vari esempi di come utilizzarli"):
 * each a piece of the kit inside a small real screen, with the pieces it usually goes with.
 */
export const USAGE_EXAMPLES: readonly UsageExample[] = [
  { kind: 'player', piece: 'glass-slider', name: 'Glass slider', caption: "A player's volume and progress" },
  { kind: 'settings', piece: 'glass-switch', name: 'Glass switch', caption: 'A list of settings' },
  { kind: 'stock', piece: 'figure', name: 'Figure and delta', caption: 'A stock at a glance' },
  { kind: 'shifts', piece: 'schedule-grid', name: 'Schedule grid', caption: 'A week of shifts' },
  { kind: 'month', piece: 'segmented-bar', name: 'Segmented bar', caption: 'Where a month went' },
  { kind: 'find', piece: 'glass-search', name: 'Glass search', caption: 'Finding a shift' },
];

const WEEK = [
  { key: 'mon', label: '24', caption: 'Mon' },
  { key: 'tue', label: '25', caption: 'Tue' },
  { key: 'wed', label: '26', caption: 'Wed', today: true },
  { key: 'thu', label: '27', caption: 'Thu' },
  { key: 'fri', label: '28', caption: 'Fri' },
  { key: 'sat', label: '29', caption: 'Sat', off: true },
] satisfies LenziScheduleDay[];
const CODES = ['T1', 'T2', 'T3', 'RW'];

/** One example: a small screen made of the kit's pieces, live (try them), with made-up data. */
@Component({
  selector: 'app-usage-example',
  imports: [
    LenziDelta,
    LenziFigure,
    LenziFigureGrid,
    LenziGlassSearch,
    LenziGlassSegmented,
    LenziGlassSlider,
    LenziGlassSwitch,
    LenziScheduleGrid,
    LenziSegmentedBar,
  ],
  templateUrl: './usage-example.html',
  styleUrl: './usage-example.css',
})
export class UsageExampleView {
  readonly kind = input.required<UsageKind>();

  // player
  protected readonly played = signal(38);
  protected readonly volume = signal(70);
  protected readonly outputs = [
    { value: 'speakers', label: 'Speakers' },
    { value: 'headphones', label: 'Headphones' },
  ];
  protected readonly output = signal<string | null>('speakers');

  // settings
  protected readonly settings = [
    { name: 'Notifications', words: 'A message when a shift changes', on: signal(true) },
    { name: 'Weekly report', words: 'Every Monday, the week before', on: signal(false) },
    { name: 'Reduce transparency', words: 'Every surface solid', on: signal(false) },
  ];

  // shifts
  protected readonly week: LenziScheduleDay[] = WEEK;
  protected readonly people: LenziScheduleRow[] = ['Anna', 'Bruno', 'Carla', 'Dario'].map((name, p) => ({
    id: p + 1,
    name,
    color: identityColor(p + 1, 0.5),
    cells: Object.fromEntries(
      WEEK.filter((day) => !day.off && (WEEK.indexOf(day) + p) % 5 !== 4).map((day, d) => {
        const c = (d + p) % CODES.length;
        return [day.key, { text: CODES[c]!, color: identityColor(c + 1), label: `Shift ${CODES[c]}` }];
      }),
    ),
  }));

  // month
  protected readonly spent: LenziSegment[] = [
    { id: 1, value: 620, label: 'Rent' },
    { id: 2, value: 240, label: 'Food' },
    { id: 3, value: 90, label: 'Transport' },
    { id: 4, value: 150, label: 'Going out' },
  ];
  protected readonly periods = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
  ];
  protected readonly period = signal<string | null>('month');

  // find
  protected readonly query = signal('night');
  private readonly shifts = [
    { name: 'Night', who: 'Anna', when: 'Monday 24' },
    { name: 'Night', who: 'Dario', when: 'Wednesday 26' },
    { name: 'Morning', who: 'Bruno', when: 'Thursday 27' },
    { name: 'Night on call', who: 'Carla', when: 'Friday 28' },
  ];
  protected readonly found = computed(() => {
    const words = this.query().trim().toLowerCase().split(/\s+/).filter(Boolean);
    return this.shifts.filter((shift) => words.every((word) => `${shift.name} ${shift.who} ${shift.when}`.toLowerCase().includes(word)));
  });
}

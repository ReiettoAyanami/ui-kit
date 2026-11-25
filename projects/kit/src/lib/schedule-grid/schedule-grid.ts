import { NgTemplateOutlet } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Component, ElementRef, afterRenderEffect, booleanAttribute, computed, inject, input, output } from '@angular/core';

/** One column: a day (or any slot) of the span shown. */
export interface LenziScheduleDay {
  /** Its key in the rows' cells: an ISO date. */
  key: string;
  /** On top, bold: the day of the month. */
  label: string;
  /** Under it: the weekday. */
  caption?: string;
  /** A day off for everyone (a weekend, a holiday): its column is shaded. */
  off?: boolean;
  /** Today: its column is marked in the accent. */
  today?: boolean;
  /** What a pointer shows over its header, and what a screen reader hears: "Christmas". */
  title?: string;
}

/** What is written in one cell. */
export interface LenziScheduleCell {
  /** The main fact, short: a shift's code. */
  text: string;
  /** A Material icon in place of the text, for what has no short code (a holiday); `label` says it in words. */
  icon?: string | null;
  /** A second fact under it, smaller: an on-call. */
  detail?: string | null;
  /** The colour of the cell: the colour of what it says (its identity colour, or the one the user chose for it); none: a neutral cell. */
  color?: string | null;
  /** The colour of the second fact, as a dot before it; none: no dot. */
  detailColor?: string | null;
  /** A rule the cell breaks, in words: the cell is marked in the status colour and says it. */
  problem?: string | null;
  /** What a screen reader hears, and the tooltip: "Shift T1, on call RS". */
  label?: string;
}

/** One row: a person (or any entity), their name fixed at the left. */
export interface LenziScheduleRow {
  id: string | number;
  name: string;
  /** The dot before the name (its identity colour); none: no dot. */
  color?: string | null;
  /** By day key; a day with nothing is absent. */
  cells: Readonly<Record<string, LenziScheduleCell | undefined>>;
}

/** A cell that was tapped. */
export interface LenziSchedulePick {
  row: LenziScheduleRow;
  day: LenziScheduleDay;
  cell: LenziScheduleCell | null;
}

/**
 * A grid of who does what on which day (RULES.md, "Tables"; first for the shifts dashboard,
 * 2026-11-24): one row per person with their name fixed at the left, one column per day with its
 * number on top and its weekday under it, a short code in each cell in its identity colour. Days off
 * are shaded, today is marked, one row can stand out (the person looking). It scrolls sideways inside
 * its own box and opens on today. With `editable`, every cell is a button and says which was tapped;
 * the host opens what changes it.
 */
@Component({
  selector: 'lenzi-schedule-grid',
  imports: [NgTemplateOutlet, MatIconModule],
  templateUrl: './schedule-grid.html',
  styleUrl: './schedule-grid.css',
})
export class LenziScheduleGrid {
  /** The header of the names' column: "Person". */
  readonly nameHeader = input.required<string>();
  /** What the grid is, for a screen reader: "Shifts of January". */
  readonly label = input.required<string>();
  readonly days = input.required<readonly LenziScheduleDay[]>();
  readonly rows = input.required<readonly LenziScheduleRow[]>();
  /** The row that stands out (the person looking); null: none. */
  readonly highlight = input<string | number | null>(null);
  /** Cells are buttons: `picked` says which was tapped. */
  readonly editable = input(false, { transform: booleanAttribute });
  /** What a screen reader hears for an empty cell. */
  readonly emptyLabel = input('Empty');
  readonly picked = output<LenziSchedulePick>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The column of today, to scroll it into view when the days change. */
  private readonly todayKey = computed(() => this.days().find((day) => day.today)?.key ?? null);

  constructor() {
    afterRenderEffect(() => {
      const key = this.todayKey();
      if (!key) return;
      const box = this.host.nativeElement.querySelector<HTMLElement>('.grid-scroll');
      const column = box?.querySelector<HTMLElement>(`th[data-day="${CSS.escape(key)}"]`);
      const names = box?.querySelector<HTMLElement>('th.name');
      if (!box || !column) return;
      // Today a little after the names, so the days before it still show.
      box.scrollLeft = Math.max(0, column.offsetLeft - (names?.offsetWidth ?? 0) - column.offsetWidth * 2);
    });
  }

  protected cellOf(row: LenziScheduleRow, day: LenziScheduleDay): LenziScheduleCell | null {
    return row.cells[day.key] ?? null;
  }

  protected labelOf(row: LenziScheduleRow, day: LenziScheduleDay): string {
    const cell = this.cellOf(row, day);
    const what = cell?.text ? (cell.label ?? [cell.text, cell.detail].filter(Boolean).join(', ')) : this.emptyLabel();
    return [`${row.name}, ${day.title ?? [day.caption, day.label].filter(Boolean).join(' ')}: ${what}`, cell?.problem].filter(Boolean).join('. ');
  }

  /** The tooltip: what the cell says, then the rule it breaks. */
  protected titleOf(cell: LenziScheduleCell | null): string | null {
    return [cell?.label, cell?.problem].filter(Boolean).join('\n') || null;
  }

  protected pick(row: LenziScheduleRow, day: LenziScheduleDay): void {
    this.picked.emit({ row, day, cell: this.cellOf(row, day) });
  }
}


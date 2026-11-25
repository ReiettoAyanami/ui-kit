import { NgTemplateOutlet } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Component, DestroyRef, ElementRef, afterNextRender, afterRenderEffect, booleanAttribute, computed, inject, input, model, output } from '@angular/core';

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

/** Cells chosen together: the rows (in the grid's order) times the days (in order). */
export interface LenziScheduleSelection {
  rowIds: (string | number)[];
  dayKeys: string[];
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
 * the host opens what changes it. With `multiple` too, cells are chosen together (lenzi, 2026-11-25:
 * "permettimi di segnalare più caselle per inserire i turni più facilmente, drag and drop"): dragged over
 * with a mouse, held then dragged with a finger, Shift+click from the last one; `selection` says which.
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
  /** Cells can be chosen together (with `editable`). */
  readonly multiple = input(false, { transform: booleanAttribute });
  /** The rows that may be chosen together; null: all. */
  readonly selectableRows = input<readonly (string | number)[] | null>(null);
  /** The cells chosen together; null: none. Two or more cells, or none. */
  readonly selection = model<LenziScheduleSelection | null>(null);
  readonly picked = output<LenziSchedulePick>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** "rowId|dayKey" of every chosen cell, for the template. */
  protected readonly chosen = computed(() => {
    const selection = this.selection();
    const keys = new Set<string>();
    for (const row of selection?.rowIds ?? []) for (const day of selection?.dayKeys ?? []) keys.add(`${row}|${day}`);
    return keys;
  });

  /** Where a choice of several cells starts (the last cell tapped, or where a drag began). */
  private anchor: { row: number; day: number } | null = null;
  /** A drag (or a held finger) is choosing cells; it moved to another cell. */
  private dragging = false;
  private dragged = false;
  /** The click that ends a drag is not a tap. */
  private swallowClick = false;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private holdStart: { x: number; y: number } | null = null;

  /** The column of today, to scroll it into view when the days change. */
  private readonly todayKey = computed(() => this.days().find((day) => day.today)?.key ?? null);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // A finger choosing cells must not scroll the box: only a listener that may cancel the move can stop it.
      const box = this.host.nativeElement.querySelector<HTMLElement>('.grid-scroll');
      const hold = (event: TouchEvent) => {
        if (this.dragging) event.preventDefault();
      };
      box?.addEventListener('touchmove', hold, { passive: false });
      destroyRef.onDestroy(() => box?.removeEventListener('touchmove', hold));
    });
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

  protected pick(row: LenziScheduleRow, day: LenziScheduleDay, event?: MouseEvent): void {
    if (this.swallowClick) {
      this.swallowClick = false;
      return;
    }
    const at = this.indexOf(row, day);
    if (this.multiple() && event?.shiftKey && this.anchor && at) {
      this.choose(this.anchor, at);
      return;
    }
    this.selection.set(null);
    this.anchor = at;
    this.picked.emit({ row, day, cell: this.cellOf(row, day) });
  }

  /** Esc lets go of the cells chosen. */
  protected escape(): void {
    if (this.selection()) this.selection.set(null);
  }

  // ---- choosing several cells

  protected pointerDown(event: PointerEvent, row: LenziScheduleRow, day: LenziScheduleDay): void {
    if (!this.multiple() || !this.editable() || event.button !== 0 || event.shiftKey) return;
    const at = this.indexOf(row, day);
    if (!at || !this.selectable(row.id)) return;
    this.anchor = at;
    this.dragged = false;
    if (event.pointerType === 'touch') {
      // A finger scrolls the box; held still for a moment, it chooses instead.
      this.holdStart = { x: event.clientX, y: event.clientY };
      this.holdTimer = setTimeout(() => {
        this.holdTimer = null;
        this.dragging = true;
        this.choose(at, at);
        navigator.vibrate?.(10);
      }, 450);
    } else {
      this.dragging = true;
    }
  }

  protected pointerMove(event: PointerEvent): void {
    if (this.holdTimer && this.holdStart && Math.hypot(event.clientX - this.holdStart.x, event.clientY - this.holdStart.y) > 8) this.cancelHold();
    if (!this.dragging || !this.anchor) return;
    const at = this.cellAt(event.clientX, event.clientY);
    if (!at) return;
    if (at.row !== this.anchor.row || at.day !== this.anchor.day || event.pointerType === 'touch') {
      this.dragged = true;
      this.choose(this.anchor, at);
    }
  }

  protected pointerUp(): void {
    this.cancelHold();
    if (this.dragging && this.dragged) this.swallowClick = true;
    if (this.dragging && this.dragged && this.selection() && this.cellCount(this.selection()!) < 2) this.selection.set(null);
    this.dragging = false;
  }

  private cancelHold(): void {
    if (this.holdTimer) clearTimeout(this.holdTimer);
    this.holdTimer = null;
    this.holdStart = null;
  }

  private selectable(rowId: string | number): boolean {
    const rows = this.selectableRows();
    return !rows || rows.includes(rowId);
  }

  private indexOf(row: LenziScheduleRow, day: LenziScheduleDay): { row: number; day: number } | null {
    const r = this.rows().indexOf(row);
    const d = this.days().indexOf(day);
    return r < 0 || d < 0 ? null : { row: r, day: d };
  }

  /** The cell under a point of the screen (a pointer held captures its events on the cell it began on). */
  private cellAt(x: number, y: number): { row: number; day: number } | null {
    const cell = this.host.nativeElement.ownerDocument.elementFromPoint(x, y)?.closest<HTMLElement>('td[data-row]');
    if (!cell || !this.host.nativeElement.contains(cell)) return null;
    return { row: Number(cell.dataset['row']), day: Number(cell.dataset['column']) };
  }

  /** The rectangle from one cell to another, the rows that may not be chosen left out. */
  private choose(from: { row: number; day: number }, to: { row: number; day: number }): void {
    const rows = this.rows().slice(Math.min(from.row, to.row), Math.max(from.row, to.row) + 1).filter((r) => this.selectable(r.id));
    const days = this.days().slice(Math.min(from.day, to.day), Math.max(from.day, to.day) + 1);
    const next = { rowIds: rows.map((r) => r.id), dayKeys: days.map((d) => d.key) };
    const current = this.selection();
    if (current && current.rowIds.join() === next.rowIds.join() && current.dayKeys.join() === next.dayKeys.join()) return;
    this.selection.set(rows.length && days.length ? next : null);
  }

  private cellCount(selection: LenziScheduleSelection): number {
    return selection.rowIds.length * selection.dayKeys.length;
  }
}


import { Component, computed, input, output } from '@angular/core';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

/** One column of figures. */
export interface KitTableColumn {
  key: string;
  /** Its header: "Stock", "Spent". */
  label: string;
  /** What the column is: the header's tooltip. */
  description?: string;
  /** Text, at the left; by default a number, at the right with its digits in columns. */
  text?: boolean;
}

/** One row: an entity, its name fixed at the left. */
export interface KitTableRow {
  id: string | number;
  /** Its name, bold; cut when long (the whole name is on its page). */
  name: string;
  /** Lines under the name, smaller: its substance, the day it was bought. One fact per line. */
  details?: readonly string[];
  /** The dot before the name (a CSS colour, its identity colour); none: no dot. */
  color?: string | null;
  /** What the name column sorts by, when not the name (an ISO instant, for a moment). */
  sortKey?: string;
  /** The cells, by column key: the API's numbers (decimal strings) or text; null: nothing ("—"). */
  values: Readonly<Record<string, string | number | null | undefined>>;
  /** What a screen reader hears for the row: "Open Birra". */
  label?: string;
}

/** How a cell reads: the page formats (a currency, a unit); by default the value as it is, "—" for none. */
export type KitCellFormat = (value: string | number | null | undefined, column: KitTableColumn, row: KitTableRow) => string;

const defaultFormat: KitCellFormat = (value) => (value === null || value === undefined || value === '' ? '—' : String(value));

/**
 * A table of figures (RULES.md, "Tables"; substance-tracker `ui/metrics-table`): one row per
 * entity, its name fixed at the left with its identity dot, one column per figure, the numbers of
 * the API. The header and the names stay in place while it scrolls sideways inside its own box,
 * never the page. A tap on a header orders the rows by that column (the host keeps the choice, in
 * the URL or a signal, and gives it back); a tap on a row says which, and the host opens it. A cell
 * with no value goes last in either direction.
 */
@Component({
  selector: 'kit-data-table',
  imports: [MatSortModule, MatTableModule],
  templateUrl: './data-table.html',
  styleUrl: './data-table.css',
})
export class KitDataTable {
  /** The header of the names' column: "Substance". */
  readonly nameHeader = input.required<string>();
  /** What the table is, for a screen reader. */
  readonly label = input.required<string>();
  readonly columns = input.required<readonly KitTableColumn[]>();
  readonly rows = input.required<readonly KitTableRow[]>();
  /** The column the rows are ordered by ('name' or a column's key); '' = the order given. */
  readonly sort = input('');
  readonly direction = input<'asc' | 'desc' | ''>('');
  readonly format = input<KitCellFormat>(defaultFormat);
  /** The locale names are compared in. */
  readonly locale = input('en-GB');
  readonly sortChange = output<Sort>();
  readonly opened = output<KitTableRow>();

  protected readonly columnIds = computed(() => ['name', ...this.columns().map((c) => c.key)]);

  private readonly collator = computed(() => new Intl.Collator(this.locale()));

  /** The rows, in the order of the column chosen. */
  protected readonly sorted = computed<KitTableRow[]>(() => {
    const rows = [...this.rows()];
    const sort = this.sort();
    const direction = this.direction();
    if (!sort || !direction) return rows;
    const column = this.columns().find((c) => c.key === sort);
    const text = sort === 'name' || column?.text === true;
    const cell = (row: KitTableRow): string | number | null => {
      if (sort === 'name') return row.sortKey ?? row.name;
      const value = row.values[sort];
      if (value === null || value === undefined || value === '') return null;
      return text ? String(value) : Number(value);
    };
    const collator = this.collator();
    return rows.sort((a, b) => {
      const x = cell(a);
      const y = cell(b);
      if (x === y) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      const order = typeof x === 'string' ? collator.compare(x, String(y)) : x - (y as number);
      return direction === 'asc' ? order : -order;
    });
  });

  protected cell(row: KitTableRow, column: KitTableColumn): string {
    return this.format()(row.values[column.key], column, row);
  }
}

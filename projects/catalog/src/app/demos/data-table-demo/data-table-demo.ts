import { Component, computed, inject, input, signal } from '@angular/core';
import { Sort } from '@angular/material/sort';

import { KitCellFormat, KitDataTable, KitTableColumn, KitTableRow, identityColor } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

const NAMES = ['Birra', 'Caffè', 'Whisky', 'Sigarette', 'Tè verde', 'Acqua frizzante', 'Peroni', 'Capsule', 'Gin', 'Rum', 'Vino', 'Grappa'];
const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' });

/** A table that orders itself when a header is tapped (the page keeps the order) and says which row was opened. */
@Component({
  selector: 'app-data-table-demo',
  imports: [KitDataTable],
  templateUrl: './data-table-demo.html',
  styleUrl: './data-table-demo.css',
})
export class DataTableDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);

  protected readonly sort = signal('');
  protected readonly direction = signal<'asc' | 'desc' | ''>('');
  protected readonly columns: KitTableColumn[] = [
    { key: 'stock', label: 'Stock', description: 'What is left of the active batches' },
    { key: 'spent', label: 'Spent', description: 'What the period cost' },
    { key: 'perDay', label: 'Per day', description: 'An average day of the period' },
    { key: 'unit', label: 'Unit', text: true },
  ];
  protected readonly rows = computed<KitTableRow[]>(() =>
    NAMES.slice(0, Number(this.values()['rows'] ?? 5)).map((name, i) => ({
      id: i + 1,
      name,
      color: identityColor(i + 1),
      details: this.values()['details'] ? [`${(i % 4) + 1} active batches`] : undefined,
      values: { stock: ((i * 37) % 120).toFixed(3), spent: i === 2 ? null : (((i + 3) * 11.37) % 90).toFixed(2), perDay: ((i * 0.7) % 3).toFixed(2), unit: i % 2 ? 'capsula' : 'bottiglia' },
    })),
  );
  protected readonly format: KitCellFormat = (value, column) => {
    if (value === null || value === undefined) return '—';
    if (column.key === 'spent') return money.format(Number(value));
    if (column.text) return String(value);
    return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 }).format(Number(value));
  };

  protected order(sort: Sort): void {
    this.sort.set(sort.direction ? sort.active : '');
    this.direction.set(sort.direction);
    this.events.log(sort.direction ? `ordered by ${sort.active}, ${sort.direction}` : 'order of the API');
  }

  protected open(row: KitTableRow): void {
    this.events.log(`opened ${row.name}`);
  }
}

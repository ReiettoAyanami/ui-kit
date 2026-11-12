import { TestBed } from '@angular/core/testing';

import { KitCellFormat, KitDataTable, KitTableColumn, KitTableRow } from './data-table';

describe('KitDataTable', () => {
  const columns: KitTableColumn[] = [
    { key: 'stock', label: 'Stock', description: 'What is left' },
    { key: 'unit', label: 'Unit', text: true },
  ];
  const rows: KitTableRow[] = [
    { id: 1, name: 'Birra', details: ['6 batches'], color: 'red', values: { stock: '12.500', unit: 'bottiglia' } },
    { id: 2, name: 'Caffè', values: { stock: '3', unit: 'capsula' } },
    { id: 3, name: 'acqua', values: { stock: null, unit: 'l' } },
  ];

  function table(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(KitDataTable);
    fixture.componentRef.setInput('nameHeader', 'Substance');
    fixture.componentRef.setInput('label', 'Substances');
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('rows', rows);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const names = () => Array.from(element.querySelectorAll('.name-text')).map((n) => n.textContent?.trim());
    return { fixture, element, names };
  }

  it('shows a row per entity: its dot, its name with its details, its cells; "—" for nothing', () => {
    const { element, names } = table();
    expect(element.querySelector('table')?.getAttribute('aria-label')).toBe('Substances');
    expect(names()).toEqual(['Birra', 'Caffè', 'acqua']);
    expect(element.querySelector('.name-detail')?.textContent?.trim()).toBe('6 batches');
    expect(element.querySelectorAll('.dot').length).toBe(1);
    const cells = Array.from(element.querySelectorAll('tr.row')[2]!.querySelectorAll('td')).map((td) => td.textContent?.trim());
    expect(cells).toEqual(['acqua', '—', 'l']);
  });

  it('orders by a number column, the empty cells last either way', () => {
    expect(table({ sort: 'stock', direction: 'asc' }).names()).toEqual(['Caffè', 'Birra', 'acqua']);
    expect(table({ sort: 'stock', direction: 'desc' }).names()).toEqual(['Birra', 'Caffè', 'acqua']);
  });

  it('orders names the way people read them: case and accents aside', () => {
    expect(table({ sort: 'name', direction: 'asc' }).names()).toEqual(['acqua', 'Birra', 'Caffè']);
  });

  it('formats the cells the way the page says, and says which row was tapped', () => {
    const format: KitCellFormat = (value, column) => (column.key === 'stock' && value != null ? `${Number(value)} u` : String(value ?? '—'));
    const { element, fixture } = table({ format });
    expect(element.querySelector('tr.row td.number')?.textContent?.trim()).toBe('12.5 u');
    const opened: KitTableRow[] = [];
    fixture.componentInstance.opened.subscribe((row) => opened.push(row));
    element.querySelectorAll<HTMLElement>('tr.row')[1]!.click();
    expect(opened.map((row) => row.id)).toEqual([2]);
    expect(element.querySelectorAll('tr.row')[1]!.getAttribute('aria-label')).toBe('Open Caffè');
  });
});

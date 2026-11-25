import { TestBed } from '@angular/core/testing';

import { LenziScheduleDay, LenziSchedulePick, LenziScheduleGrid, LenziScheduleRow } from './schedule-grid';

describe('LenziScheduleGrid', () => {
  const days: LenziScheduleDay[] = [
    { key: '2026-01-02', label: '2', caption: 'Fri' },
    { key: '2026-01-03', label: '3', caption: 'Sat', off: true },
    { key: '2026-01-04', label: '4', caption: 'Sun', off: true, today: true, title: 'Sunday 4 January' },
  ];
  const rows: LenziScheduleRow[] = [
    { id: 'anna', name: 'Anna', color: 'red', cells: { '2026-01-02': { text: 'T1', detail: 'RS', color: 'blue', label: 'Shift T1, on call RS' } } },
    { id: 'bruno', name: 'Bruno', cells: { '2026-01-04': { text: 'RW' } } },
  ];

  function grid(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(LenziScheduleGrid);
    fixture.componentRef.setInput('nameHeader', 'Person');
    fixture.componentRef.setInput('label', 'Shifts of January');
    fixture.componentRef.setInput('days', days);
    fixture.componentRef.setInput('rows', rows);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('shows a column per day, its number over its weekday; days off shaded, today marked', () => {
    const { element } = grid();
    expect(element.querySelector('table')?.getAttribute('aria-label')).toBe('Shifts of January');
    const headers = Array.from(element.querySelectorAll('th.day'));
    expect(headers.map((h) => h.querySelector('.day-label')?.textContent?.trim())).toEqual(['2', '3', '4']);
    expect(headers.map((h) => h.querySelector('.day-caption')?.textContent?.trim())).toEqual(['Fri', 'Sat', 'Sun']);
    expect(headers.map((h) => h.classList.contains('off'))).toEqual([false, true, true]);
    expect(headers[2]!.classList.contains('today')).toBe(true);
    expect(headers[2]!.getAttribute('title')).toBe('Sunday 4 January');
  });

  it('shows a row per person, their dot and name, and each cell: the code, the detail under it, its colour', () => {
    const { element } = grid();
    expect(Array.from(element.querySelectorAll('tbody .name-text')).map((n) => n.textContent?.trim())).toEqual(['Anna', 'Bruno']);
    expect(element.querySelectorAll('tbody .dot').length).toBe(1);
    const tag = element.querySelector<HTMLElement>('tbody tr td .tag')!;
    expect(tag.querySelector('.tag-text')?.textContent?.trim()).toBe('T1');
    expect(tag.querySelector('.tag-detail')?.textContent?.trim()).toBe('RS');
    expect(tag.classList.contains('toned')).toBe(true);
    expect(tag.style.getPropertyValue('--lenzi-schedule-tone')).toBe('blue');
    const neutral = element.querySelectorAll<HTMLElement>('tbody tr')[1]!.querySelector('.tag')!;
    expect(neutral.classList.contains('toned')).toBe(false);
    expect(element.querySelectorAll('tbody .tag').length).toBe(2);
  });

  it('only reads when not editable: no buttons', () => {
    expect(grid().element.querySelectorAll('button').length).toBe(0);
  });

  it('makes every cell a button when editable, and says which was tapped, empty ones too', () => {
    const { element, fixture } = grid({ editable: true, emptyLabel: 'Nothing' });
    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('button.slot'));
    expect(buttons.length).toBe(6);
    expect(buttons[0]!.getAttribute('aria-label')).toBe('Anna, Fri 2: Shift T1, on call RS');
    expect(buttons[1]!.getAttribute('aria-label')).toBe('Anna, Sat 3: Nothing');
    expect(buttons[5]!.getAttribute('aria-label')).toBe('Bruno, Sunday 4 January: RW');
    const picks: LenziSchedulePick[] = [];
    fixture.componentInstance.picked.subscribe((pick) => picks.push(pick));
    buttons[0]!.click();
    buttons[1]!.click();
    expect(picks.map((p) => [p.row.id, p.day.key, p.cell?.text ?? null])).toEqual([
      ['anna', '2026-01-02', 'T1'],
      ['anna', '2026-01-03', null],
    ]);
  });

  it('marks a cell that breaks a rule and says the rule; shows the second fact with its own colour', () => {
    const broken: LenziScheduleRow[] = [
      { id: 'anna', name: 'Anna', cells: { '2026-01-02': { text: 'T1', detail: 'RS', color: 'blue', detailColor: 'orange', label: 'Shift T1, on call RS', problem: 'RS with T1' } } },
    ];
    const { element } = grid({ rows: broken, editable: true });
    const cell = element.querySelector('tbody td')!;
    expect(cell.classList.contains('problem')).toBe(true);
    expect(cell.querySelector('.problem-mark')?.textContent).toBe('!');
    expect((cell.querySelector('.detail-dot') as HTMLElement).style.backgroundColor).toBe('orange');
    const button = cell.querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Anna, Fri 2: Shift T1, on call RS. RS with T1');
    expect(button.getAttribute('title')).toBe('Shift T1, on call RS\nRS with T1');
    expect(element.querySelectorAll('.problem-mark').length).toBe(1);
  });

  it('shows an icon in place of the text when the cell has one, its words still for a screen reader', () => {
    const away: LenziScheduleRow[] = [{ id: 'anna', name: 'Anna', cells: { '2026-01-02': { text: 'Holiday', icon: 'beach_access', label: 'Holiday' } } }];
    const { element } = grid({ rows: away, editable: true });
    const tag = element.querySelector('tbody .tag')!;
    expect(tag.querySelector('mat-icon')?.textContent?.trim()).toBe('beach_access');
    expect(tag.querySelector('.tag-text')).toBeNull();
    expect(element.querySelector('tbody button')?.getAttribute('aria-label')).toBe('Anna, Fri 2: Holiday');
  });

  it('makes the row of the person looking stand out', () => {
    const { element } = grid({ highlight: 'bruno' });
    const highlighted = Array.from(element.querySelectorAll('tbody tr')).map((tr) => tr.classList.contains('highlight'));
    expect(highlighted).toEqual([false, true]);
  });
});

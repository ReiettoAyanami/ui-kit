import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';

import { KitPeriodPicker, kitPeriodLabel } from './period-picker';

describe('KitPeriodPicker', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }] }));

  async function picker(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(KitPeriodPicker);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('shows a field for each choice it is given, none for a null one', async () => {
    expect((await picker({ period: 30, scale: 'week' })).element.querySelectorAll('mat-form-field').length).toBe(2);
    const onlyPeriod = (await picker({ period: 30 })).element;
    expect(onlyPeriod.querySelectorAll('mat-form-field').length).toBe(1);
    expect(onlyPeriod.querySelector('mat-label')?.textContent?.trim()).toBe('Period');
    expect(onlyPeriod.querySelector('.mat-mdc-select-value')?.textContent?.trim()).toBe('Last 30 days');
  });

  it('says what was chosen, and keeps no state of its own', async () => {
    const { fixture, element } = await picker({ period: 30 });
    const chosen: number[] = [];
    fixture.componentInstance.periodChange.subscribe((days) => chosen.push(days));
    element.querySelector<HTMLElement>('.mat-mdc-select-trigger')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    Array.from(document.querySelectorAll<HTMLElement>('mat-option')).find((o) => o.textContent?.trim() === 'All time')!.click();
    expect(chosen).toEqual([0]);
  });

  it('names a period that is not in the list', () => {
    expect(kitPeriodLabel(0)).toBe('All time');
    expect(kitPeriodLabel(14)).toBe('Last 14 days');
  });
});

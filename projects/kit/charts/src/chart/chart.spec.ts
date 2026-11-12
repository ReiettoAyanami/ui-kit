import { TestBed } from '@angular/core/testing';

import { identityColor } from '@lenzi/ui-kit';

import { KitChart, kitLineColor } from './chart';

describe('KitChart', () => {
  // jsdom has no ResizeObserver; ngx-echarts watches the chart's size with one.
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });

  it('says so when there is nothing to draw', () => {
    const fixture = TestBed.createComponent(KitChart);
    fixture.componentRef.setInput('data', { periods: [], lines: [] });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.empty')?.textContent?.trim()).toBe('Nothing in the period');
  });

  it('shows a chip per line to hide it by hand, with its colour', () => {
    const fixture = TestBed.createComponent(KitChart);
    fixture.componentRef.setInput('data', {
      periods: ['W39', 'W40'],
      lines: [
        { key: 'a', name: 'Birra', values: [1, 2] },
        { key: 'b', name: 'Caffè', values: [2, 1], color: 'rgb(1, 2, 3)' },
      ],
    });
    fixture.detectChanges();
    const chips = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mat-chip-option'));
    expect(chips.map((chip) => chip.textContent?.trim())).toEqual(['Birra', 'Caffè']);
    expect(chips[1]!.querySelector<HTMLElement>('.dot')!.style.backgroundColor).toBe('rgb(1, 2, 3)');
  });

  it("a line without a colour takes the identity colour of its position", () => {
    expect(kitLineColor({ key: 'a', name: 'a', values: [] }, 0)).toBe(identityColor(1));
  });
});

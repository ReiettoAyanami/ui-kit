import { TestBed } from '@angular/core/testing';

import { LenziGlassSearch } from './glass-search';

describe('LenziGlassSearch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('searches once typing pauses, and an ✕ clears it at once', () => {
    const fixture = TestBed.createComponent(LenziGlassSearch);
    fixture.componentRef.setInput('placeholder', 'Search shifts');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const searched: string[] = [];
    fixture.componentInstance.search.subscribe((text) => searched.push(text));
    const input = element.querySelector('input')!;
    expect(input.getAttribute('aria-label')).toBe('Search shifts');
    input.value = 'T1';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(299);
    expect(searched).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(searched).toEqual(['T1']);
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.clear')!.click();
    expect(searched).toEqual(['T1', '']);
    expect(fixture.componentInstance.value()).toBe('');
  });
});

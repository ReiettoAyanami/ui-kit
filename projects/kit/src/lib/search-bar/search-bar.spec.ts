import { TestBed } from '@angular/core/testing';

import { KitSearchBar } from './search-bar';

describe('KitSearchBar', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function bar() {
    const fixture = TestBed.createComponent(KitSearchBar);
    fixture.componentRef.setInput('placeholder', 'Search substances and batches');
    const searched: string[] = [];
    fixture.componentInstance.search.subscribe((text) => searched.push(text));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector('input')!;
    const type = (text: string) => {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    return { fixture, element, input, type, searched };
  }

  it('says what it looks for inside it, as its accessible name too', () => {
    const { input } = bar();
    expect(input.placeholder).toBe('Search substances and batches');
    expect(input.getAttribute('aria-label')).toBe('Search substances and batches');
    expect(input.closest('mat-form-field')?.classList.contains('kit-search-bar')).toBe(true);
  });

  it('searches once the typing pauses, with the last text only', () => {
    const { type, searched, fixture } = bar();
    type('bi');
    vi.advanceTimersByTime(200);
    type('birra ');
    vi.advanceTimersByTime(299);
    expect(searched).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(searched).toEqual(['birra']);
    expect(fixture.componentInstance.value()).toBe('birra ');
  });

  it('the ✕ clears it and searches for everything at once', () => {
    const { type, searched, element, fixture } = bar();
    type('birra');
    element.querySelector<HTMLButtonElement>('button[aria-label="Clear the search"]')!.click();
    fixture.detectChanges();
    expect(searched).toEqual(['']);
    expect(fixture.componentInstance.value()).toBe('');
    vi.advanceTimersByTime(1000);
    expect(searched).toEqual(['']);
    expect(element.querySelector('button[aria-label="Clear the search"]')).toBeNull();
  });
});

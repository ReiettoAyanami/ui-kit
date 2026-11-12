import { TestBed } from '@angular/core/testing';

import { LENZI_APP_ID, LenziAppearance } from './appearance';

describe('LenziAppearance', () => {
  const reduced = () => document.documentElement.classList.contains('reduce-transparency');

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('reduce-transparency');
  });

  afterEach(() => document.documentElement.classList.remove('reduce-transparency'));

  it('starts with the windows see-through: nothing reduced', () => {
    const appearance = TestBed.inject(LenziAppearance);
    TestBed.tick();

    expect(appearance.reduceTransparency()).toBe(false);
    expect(reduced()).toBe(false);
  });

  it('reducing the transparency marks the page at once, and this browser remembers it', () => {
    TestBed.inject(LenziAppearance).setReduceTransparency(true);
    TestBed.tick();
    expect(reduced()).toBe(true);
    expect(localStorage.getItem('kit.reduce-transparency')).toBe('true');

    TestBed.resetTestingModule();
    document.documentElement.classList.remove('reduce-transparency');
    const again = TestBed.inject(LenziAppearance);
    TestBed.tick();
    expect(again.reduceTransparency()).toBe(true);
    expect(reduced()).toBe(true);

    again.setReduceTransparency(false);
    TestBed.tick();
    expect(reduced()).toBe(false);
  });

  it("keeps an app's old preference under its own name", () => {
    localStorage.setItem('substance-tracker.reduce-transparency', 'true');
    TestBed.configureTestingModule({ providers: [{ provide: LENZI_APP_ID, useValue: 'substance-tracker' }] });
    expect(TestBed.inject(LenziAppearance).reduceTransparency()).toBe(true);
  });
});

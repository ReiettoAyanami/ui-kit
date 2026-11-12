import { TestBed } from '@angular/core/testing';

import { KIT_APP_ID, KitAppearance } from './appearance';

describe('KitAppearance', () => {
  const reduced = () => document.documentElement.classList.contains('reduce-transparency');

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('reduce-transparency');
  });

  afterEach(() => document.documentElement.classList.remove('reduce-transparency'));

  it('starts with the windows see-through: nothing reduced', () => {
    const appearance = TestBed.inject(KitAppearance);
    TestBed.tick();

    expect(appearance.reduceTransparency()).toBe(false);
    expect(reduced()).toBe(false);
  });

  it('reducing the transparency marks the page at once, and this browser remembers it', () => {
    TestBed.inject(KitAppearance).setReduceTransparency(true);
    TestBed.tick();
    expect(reduced()).toBe(true);
    expect(localStorage.getItem('kit.reduce-transparency')).toBe('true');

    TestBed.resetTestingModule();
    document.documentElement.classList.remove('reduce-transparency');
    const again = TestBed.inject(KitAppearance);
    TestBed.tick();
    expect(again.reduceTransparency()).toBe(true);
    expect(reduced()).toBe(true);

    again.setReduceTransparency(false);
    TestBed.tick();
    expect(reduced()).toBe(false);
  });

  it("keeps an app's old preference under its own name", () => {
    localStorage.setItem('substance-tracker.reduce-transparency', 'true');
    TestBed.configureTestingModule({ providers: [{ provide: KIT_APP_ID, useValue: 'substance-tracker' }] });
    expect(TestBed.inject(KitAppearance).reduceTransparency()).toBe(true);
  });
});

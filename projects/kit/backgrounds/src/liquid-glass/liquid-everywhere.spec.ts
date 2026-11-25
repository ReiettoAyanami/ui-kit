import { TestBed } from '@angular/core/testing';

import { LenziLiquidEverywhere } from './liquid-everywhere';

const frame = () => new Promise<void>((resolve) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 20)));

describe('LenziLiquidEverywhere', () => {
  afterEach(() => {
    document.documentElement.classList.remove('reduce-transparency');
    document.body.querySelectorAll('.test-surface').forEach((e) => e.remove());
  });

  function add(className: string): HTMLElement {
    const element = document.createElement('div');
    element.className = `${className} test-surface`;
    document.body.append(element);
    return element;
  }

  it("makes the app's surfaces glass as they come, and lets go of them when they go", async () => {
    const glass = TestBed.inject(LenziLiquidEverywhere);
    const card = add('mat-mdc-card');
    const plain = add('nothing');
    glass.start();
    await frame();
    expect(card.classList.contains('lenzi-liquid-everywhere')).toBe(true);
    expect(card.classList.contains('lenzi-liquid-glass')).toBe(true);
    expect(plain.classList.contains('lenzi-liquid-everywhere')).toBe(false);
    const dialog = add('mat-mdc-dialog-surface');
    const surface = add('lenzi-surface');
    await frame();
    await frame();
    expect(dialog.classList.contains('lenzi-liquid-everywhere')).toBe(true);
    expect(surface.classList.contains('lenzi-liquid-everywhere')).toBe(true);
    dialog.remove();
    await frame();
    await frame();
    expect(glass.count).toBe(2);
  });

  it('turns it all off with Reduce transparency, and on again', async () => {
    const glass = TestBed.inject(LenziLiquidEverywhere);
    const card = add('mat-mdc-card');
    glass.start();
    await frame();
    expect(card.classList.contains('lenzi-liquid-everywhere')).toBe(true);
    document.documentElement.classList.add('reduce-transparency');
    await frame();
    await frame();
    expect(card.classList.contains('lenzi-liquid-everywhere')).toBe(false);
    document.documentElement.classList.remove('reduce-transparency');
    await frame();
    await frame();
    expect(card.classList.contains('lenzi-liquid-everywhere')).toBe(true);
  });
});

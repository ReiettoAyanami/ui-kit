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
    const card = add('lenzi-shell-bar');
    const plain = add('mat-mdc-card');
    glass.start({ pages: false });
    await frame();
    expect(card.classList.contains('lenzi-liquid-everywhere')).toBe(true);
    expect(card.classList.contains('lenzi-liquid-glass')).toBe(true);
    expect(plain.classList.contains('lenzi-liquid-everywhere')).toBe(false);
    const dialog = add('mat-mdc-dialog-surface');
    const surface = add('lenzi-floating');
    await frame();
    await frame();
    expect(dialog.classList.contains('lenzi-liquid-everywhere')).toBe(true);
    expect(surface.classList.contains('lenzi-liquid-everywhere')).toBe(true);
    dialog.remove();
    await frame();
    await frame();
    expect(glass.count).toBe(2);
  });

  it('makes the page\'s own surfaces glass too, unless the app says pages: false (lenzi, 2026-11-26: "come i pannelli o altro")', async () => {
    const glass = TestBed.inject(LenziLiquidEverywhere);
    const card = add('mat-mdc-card');
    const panel = add('lenzi-surface');
    glass.start();
    await frame();
    expect(glass.pages).toBe(true);
    expect(card.classList.contains('lenzi-liquid-everywhere')).toBe(true);
    expect(panel.classList.contains('lenzi-liquid-everywhere')).toBe(true);
  });

  it('takes the surfaces given to it (a lit surface) until they are given back; never one kept lit', async () => {
    const glass = TestBed.inject(LenziLiquidEverywhere);
    const given = add('section');
    const kept = add('mat-mdc-card lenzi-lit lenzi-lit-only');
    glass.start();
    expect(glass.on()).toBe(true);
    const giveBack = glass.adopt(given);
    await frame();
    await frame();
    expect(given.classList.contains('lenzi-liquid-everywhere')).toBe(true);
    expect(kept.classList.contains('lenzi-liquid-everywhere')).toBe(false);
    giveBack();
    await frame();
    await frame();
    expect(given.classList.contains('lenzi-liquid-everywhere')).toBe(false);
  });

  it('puts glass on glass too: a menu over a window is glass (lenzi, 2026-11-26: "solo quelli che volevi te")', async () => {
    const glass = TestBed.inject(LenziLiquidEverywhere);
    const menu = add('mat-mdc-menu-panel');
    glass.start();
    await frame();
    expect(menu.classList.contains('lenzi-liquid-everywhere')).toBe(true);
    const dialog = add('mat-mdc-dialog-surface');
    await frame();
    await frame();
    expect(dialog.classList.contains('lenzi-liquid-everywhere')).toBe(true);
    expect(menu.classList.contains('lenzi-liquid-everywhere')).toBe(true);
  });

  it('makes every panel glass: the expansion panels, but a flat one', async () => {
    const glass = TestBed.inject(LenziLiquidEverywhere);
    const panel = add('mat-expansion-panel');
    const flat = add('mat-expansion-panel lenzi-flat');
    glass.start();
    await frame();
    expect(panel.classList.contains('lenzi-liquid-everywhere')).toBe(true);
    expect(flat.classList.contains('lenzi-liquid-everywhere')).toBe(false);
  });

  it('turns it all off with Reduce transparency, and on again', async () => {
    const glass = TestBed.inject(LenziLiquidEverywhere);
    const card = add('mat-mdc-dialog-surface');
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

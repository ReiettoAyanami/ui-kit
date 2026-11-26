// Written by hand: a test of a directive and of the services it uses.
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziLiquidEverywhere } from '../liquid-glass/liquid-everywhere';
import { LenziAmbientLight } from './ambient-light';
import { LenziLit } from './lit';

const frame = () => new Promise<void>((resolve) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 20)));

@Component({
  imports: [LenziLit],
  template: `<div lenziLit class="surface"><p>A card</p></div>`,
})
class LiquidHost {}

@Component({
  imports: [LenziLit],
  template: `<div lenziLit litOnly class="kept"><p>A demo of lit glass</p></div>`,
})
class KeptHost {}

@Component({
  imports: [LenziLit],
  template: `<div lenziLit class="surface"><p class="first">A surface</p></div>`,
})
class Host {}

@Component({
  imports: [LenziLit],
  template: `<div lenziLit class="surface" style="overflow-y: auto; max-height: 100px"><p style="height: 400px">Long</p></div>`,
})
class ScrollingHost {}

@Component({
  imports: [LenziLit],
  template: `<div class="surface" [lenziLit]="over()"><p>A card</p></div>`,
})
class SwitchedHost {
  readonly over = signal(false);
}

describe('LenziLit', () => {
  it('[lenziLit]="…" lights it only while the app says so; off it is solid and takes no light (2026-11-17)', async () => {
    const fixture = TestBed.createComponent(SwitchedHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const surface = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.surface')!;
    const light = TestBed.inject(LenziAmbientLight);
    expect(surface.classList.contains('lenzi-lit')).toBe(false);
    expect(light.wanted).toBe(false);

    fixture.componentInstance.over.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(surface.classList.contains('lenzi-lit')).toBe(true);
    expect(light.wanted).toBe(true);

    fixture.componentInstance.over.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(surface.classList.contains('lenzi-lit')).toBe(false);
    expect(light.wanted).toBe(false);

    // on again, then gone: it lets go
    fixture.componentInstance.over.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(light.wanted).toBe(true);
    fixture.destroy();
    expect(light.wanted).toBe(false);
  });

  it('makes a lit surface without putting anything inside it; lets go of the light when it goes', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const surface = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.surface')!;
    expect(surface.classList.contains('lenzi-lit')).toBe(true);
    // its children keep their places (a card's :first-child padding)
    expect(surface.children.length).toBe(1);
    expect(surface.firstElementChild?.classList.contains('first')).toBe(true);
    expect(TestBed.inject(LenziAmbientLight).wanted).toBe(true);
    fixture.destroy();
    expect(TestBed.inject(LenziAmbientLight).wanted).toBe(false);
  });

  it('a surface that scrolls keeps its light over what shows: it says how far it has scrolled (2026-11-17)', async () => {
    const fixture = TestBed.createComponent(ScrollingHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const surface = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.surface')!;
    expect(surface.classList.contains('lenzi-lit-scrolls')).toBe(true);
    expect(surface.style.getPropertyValue('--lenzi-lit-scroll-y')).toBe('0px');
    let top = 180;
    Object.defineProperty(surface, 'scrollTop', { configurable: true, get: () => top });
    surface.dispatchEvent(new Event('scroll'));
    expect(surface.style.getPropertyValue('--lenzi-lit-scroll-y')).toBe('180px');
    // gone, it no longer listens
    fixture.destroy();
    top = 40;
    surface.dispatchEvent(new Event('scroll'));
    expect(surface.style.getPropertyValue('--lenzi-lit-scroll-y')).toBe('180px');
  });

  it("in an app of Liquid Glass a lit surface is the app's glass and takes no light; litOnly keeps it lit (2026-11-26)", async () => {
    // lenzi, 2026-11-26: "Non c'è ancora nulla che sia stato convertito in liquid glass, come i pannelli o altro"
    TestBed.inject(LenziLiquidEverywhere).start();
    const light = TestBed.inject(LenziAmbientLight);
    const fixture = TestBed.createComponent(LiquidHost);
    fixture.detectChanges();
    await fixture.whenStable();
    await frame();
    await frame();
    const surface = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.surface')!;
    expect(surface.classList.contains('lenzi-liquid-lit')).toBe(true);
    expect(surface.classList.contains('lenzi-liquid-everywhere')).toBe(true);
    // still .lenzi-lit: an app gives its surfaces their own fill only :not(.lenzi-lit)
    expect(surface.classList.contains('lenzi-lit')).toBe(true);
    expect(light.wanted).toBe(false);

    const kept = TestBed.createComponent(KeptHost);
    kept.detectChanges();
    await kept.whenStable();
    await frame();
    await frame();
    const demo = (kept.nativeElement as HTMLElement).querySelector<HTMLElement>('.kept')!;
    expect(demo.classList.contains('lenzi-lit-only')).toBe(true);
    expect(demo.classList.contains('lenzi-liquid-everywhere')).toBe(false);
    expect(light.wanted).toBe(true);
    kept.destroy();
    fixture.destroy();
  });
});

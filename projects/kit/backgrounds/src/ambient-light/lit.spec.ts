// Written by hand: a test of a directive and of the services it uses.
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziAmbientLight } from './ambient-light';
import { LenziLit } from './lit';

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
});

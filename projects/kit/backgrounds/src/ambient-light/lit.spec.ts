// Written by hand: a test of a directive and of the service it uses.
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziAmbientLight } from './ambient-light';
import { LenziLit } from './lit';

@Component({
  imports: [LenziLit],
  template: `<div lenziLit class="surface">A surface</div>`,
})
class Host {}

describe('LenziLit', () => {
  it('makes a lit surface and puts the light inside it; takes it away when it goes', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const surface = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.surface')!;
    expect(surface.classList.contains('lenzi-lit')).toBe(true);
    const light = surface.querySelector('.lenzi-lit-light')!;
    expect(light).not.toBeNull();
    expect(light.getAttribute('aria-hidden')).toBe('true');
    // nothing shines yet
    expect(light.classList.contains('lenzi-lit-on')).toBe(false);
    expect(TestBed.inject(LenziAmbientLight).wanted).toBe(true);
    fixture.destroy();
    expect(TestBed.inject(LenziAmbientLight).wanted).toBe(false);
  });
});

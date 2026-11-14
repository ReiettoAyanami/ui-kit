// Written by hand: a test of a directive and of the services it uses.
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziAmbientLight } from './ambient-light';
import { LenziLit } from './lit';

@Component({
  imports: [LenziLit],
  template: `<div lenziLit class="surface"><p class="first">A surface</p></div>`,
})
class Host {}

describe('LenziLit', () => {
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
});

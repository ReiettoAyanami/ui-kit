import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziSights } from '../sights/sights';
import { LenziSolidText } from './solid-text';

@Component({
  imports: [LenziSolidText],
  template: `<section><div lenziSolidText><h2>Lorem</h2><p>Ipsum dolor</p></div></section>`,
})
class Host {}

describe('LenziSolidText', () => {
  it('makes the words solid and puts their shadow, a copy of them, just before them', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement.querySelector('[lenziSolidText]') as HTMLElement;
    expect(element.classList).toContain('lenzi-solid-text');
    // the shadow: the block copied whole just before it, hidden from screen readers, unseen with no light
    const shadow = element.previousElementSibling as HTMLElement;
    expect(shadow.classList).toContain('lenzi-solid-text-shadow');
    expect(shadow.getAttribute('aria-hidden')).toBe('true');
    expect(shadow.style.opacity).toBe('0');
    expect(shadow.textContent).toBe(element.textContent);
    expect(fixture.nativeElement.querySelectorAll('.lenzi-solid-text-shadow').length).toBe(1);
  });

  it('with boids round the words, a faint shadow away from them', async () => {
    TestBed.inject(LenziSights).add({}, () => null, () => ({ x: 10, y: 20, count: 80 }));
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const element = fixture.nativeElement.querySelector('[lenziSolidText]') as HTMLElement;
    const box = element.getBoundingClientRect();
    if (box.bottom <= 0) return; // no layout here: nothing on the screen to light
    const shadow = element.previousElementSibling as HTMLElement;
    expect(Number(shadow.style.opacity)).toBeGreaterThan(0);
    expect(Number(shadow.style.opacity)).toBeLessThanOrEqual(0.45);
  });

  it('its copy is exactly as wide as the words, to the fraction of a px (the same lines)', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement.querySelector('[lenziSolidText]') as HTMLElement;
    element.style.width = '431.4px';
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const shadow = element.previousElementSibling as HTMLElement;
    expect(shadow.style.width).toBe(`${element.getBoundingClientRect().width}px`);
  });
});

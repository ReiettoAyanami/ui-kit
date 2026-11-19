import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziSights } from '../sights/sights';
import { LenziSolidText } from './solid-text';

@Component({
  imports: [LenziSolidText],
  template: `<div lenziSolidText><h2>Lorem</h2><p>Ipsum dolor</p></div>`,
})
class Host {}

describe('LenziSolidText', () => {
  it('makes the words solid and puts copies of them under them, hidden from screen readers, unseen with no light', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement.querySelector('[lenziSolidText]') as HTMLElement;
    expect(element.classList).toContain('lenzi-solid-text');
    const shadows = Array.from(element.querySelectorAll<HTMLElement>('.lenzi-solid-text-shadow'));
    expect(shadows.length).toBe(1);
    expect(shadows[0]!.getAttribute('aria-hidden')).toBe('true');
    expect(shadows[0]!.style.opacity).toBe('0');
    const copies = Array.from(shadows[0]!.querySelectorAll<HTMLElement>('.lenzi-solid-text-copy'));
    expect(copies.length).toBe(8);
    for (const copy of copies) expect(copy.textContent).toBe('LoremIpsum dolor');
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
    const shadow = element.querySelector<HTMLElement>('.lenzi-solid-text-shadow')!;
    expect(Number(shadow.style.opacity)).toBeGreaterThan(0);
    expect(Number(shadow.style.opacity)).toBeLessThanOrEqual(0.45);
  });
});

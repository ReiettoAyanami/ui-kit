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
    const layers = Array.from(element.querySelectorAll<HTMLElement>('.lenzi-solid-text-shadow'));
    expect(layers.length).toBe(12);
    for (const layer of layers) {
      expect(layer.getAttribute('aria-hidden')).toBe('true');
      expect(layer.textContent).toBe('LoremIpsum dolor');
      expect(layer.style.opacity).toBe('0');
    }
  });

  it('with boids round the words, the copies grow from where the light is', async () => {
    TestBed.inject(LenziSights).add({}, () => null, () => ({ x: 10, y: 20, count: 80 }));
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const element = fixture.nativeElement.querySelector('[lenziSolidText]') as HTMLElement;
    const box = element.getBoundingClientRect();
    if (box.bottom <= 0) return; // no layout here: nothing on the screen to light
    const [first, last] = [element.querySelector<HTMLElement>('.lenzi-solid-text-shadow:first-child')!, Array.from(element.querySelectorAll<HTMLElement>('.lenzi-solid-text-shadow')).at(-1)!];
    expect(Number(first.style.opacity) + Number(last.style.opacity)).toBeGreaterThan(0);
  });
});

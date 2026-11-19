import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziLightBlockers } from './light-blockers';
import { LenziLightRays } from './light-rays';
import { LenziSolidText } from './solid-text';
import { LenziSights } from '../sights/sights';

@Component({
  imports: [LenziLightRays, LenziSolidText],
  template: `<section><div lenziSolidText><h2>Lorem</h2><p>Ipsum dolor</p></div></section><lenzi-light-rays />`,
})
class Host {}

describe('LenziSolidText', () => {
  it('makes the words solid and stops the light: it is a blocker that draws its words', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement.querySelector('[lenziSolidText]') as HTMLElement;
    expect(element.classList).toContain('lenzi-solid-text');
    const blockers = TestBed.inject(LenziLightBlockers).all();
    expect(blockers.length).toBe(1);
    const drawn: string[] = [];
    blockers[0]!.draw({ set font(_: string) {}, fillText: (text: string) => drawn.push(text) } as unknown as CanvasRenderingContext2D);
    // no layout here: nothing on the screen, or its words
    expect(drawn.every((text) => ['Lorem', 'Ipsum', 'dolor'].includes(text))).toBe(true);
    fixture.destroy();
    expect(TestBed.inject(LenziLightBlockers).all().length).toBe(0);
  });
});

describe('LenziLightRays', () => {
  it('is a picture over the page, hidden from screen readers, never in the way of a tap', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const rays = fixture.nativeElement.querySelector('lenzi-light-rays') as HTMLElement;
    expect(rays.classList).toContain('lenzi-light-rays');
    expect(rays.getAttribute('aria-hidden')).toBe('true');
    expect(rays.querySelector('canvas')).not.toBeNull();
  });
});

describe('LenziSights lights', () => {
  it('gives every light of every source, and none once a source is gone', () => {
    const sights = new LenziSights();
    const leave = sights.addLights({}, () => [{ x: 1, y: 2, radius: 3, colour: '#fff' }]);
    sights.addLights({}, () => [{ x: 4, y: 5, radius: 6, colour: '#000' }]);
    expect(sights.lights().length).toBe(2);
    leave();
    expect(sights.lights()).toEqual([{ x: 4, y: 5, radius: 6, colour: '#000' }]);
  });
});

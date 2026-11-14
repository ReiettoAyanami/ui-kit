import { TestBed } from '@angular/core/testing';

import { LenziSights } from '../sights/sights';
import { LenziBlobFlockBackground } from './blob-flock-background';

describe('LenziBlobFlockBackground', () => {
  it('without WebGL2 shows a still picture, has no canvas, and is hidden from screen readers', async () => {
    const fixture = TestBed.createComponent(LenziBlobFlockBackground);
    fixture.componentRef.setInput('boids', 500);
    fixture.componentRef.setInput('blobs', 4);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.classList.contains('lenzi-background-still')).toBe(true);
    expect(element.querySelector('canvas')).toBeNull();
  });

  it('is a source of sights while it is there; with no flock drawn yet it has none', () => {
    const sights = TestBed.inject(LenziSights);
    const fixture = TestBed.createComponent(LenziBlobFlockBackground);
    expect(sights.nearest({ x: 0, y: 0 })).toBeNull();
    fixture.destroy();
    expect(sights.nearest({ x: 0, y: 0 })).toBeNull();
  });
});

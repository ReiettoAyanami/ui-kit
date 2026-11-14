// Written by hand: the component was generated without its spec.
import { TestBed } from '@angular/core/testing';

import { LenziFlockBackground } from './flock-background';

describe('LenziFlockBackground', () => {
  it('without WebGL2 shows a still picture, has no canvas, and is hidden from screen readers', async () => {
    const fixture = TestBed.createComponent(LenziFlockBackground);
    fixture.componentRef.setInput('follow', 'target');
    fixture.componentRef.setInput('count', 900);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.classList.contains('lenzi-background-still')).toBe(true);
    expect(element.querySelector('canvas')).toBeNull();
  });
});

// Written by hand: the component was generated without its spec.
import { TestBed } from '@angular/core/testing';

import { LenziBlobBackground } from './blob-background';

describe('LenziBlobBackground', () => {
  it('without WebGL2 shows a still picture, has no canvas, and is hidden from screen readers', async () => {
    const fixture = TestBed.createComponent(LenziBlobBackground);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.classList.contains('lenzi-background-still')).toBe(true);
    expect(element.querySelector('canvas')).toBeNull();
  });

  it('fills its box when asked', async () => {
    const fixture = TestBed.createComponent(LenziBlobBackground);
    fixture.componentRef.setInput('fill', 'box');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).classList.contains('lenzi-background-box')).toBe(true);
  });
});

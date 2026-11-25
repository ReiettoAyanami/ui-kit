import { TestBed } from '@angular/core/testing';

import { LenziGlassSlider } from './glass-slider';

describe('LenziGlassSlider', () => {
  function make(value = 40) {
    const fixture = TestBed.createComponent(LenziGlassSlider);
    fixture.componentRef.setInput('label', 'Volume');
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('step', 5);
    fixture.detectChanges();
    const track = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.track')!;
    const key = (k: string) => track.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    return { fixture, track, key };
  }

  it('is a slider with its name, ends and value', () => {
    const { track } = make();
    expect(track.getAttribute('role')).toBe('slider');
    expect(track.getAttribute('aria-label')).toBe('Volume');
    expect([track.getAttribute('aria-valuemin'), track.getAttribute('aria-valuemax'), track.getAttribute('aria-valuenow')]).toEqual(['0', '100', '40']);
  });

  it('steps with the keys and keeps inside its ends', () => {
    const { fixture, key } = make(95);
    key('ArrowRight');
    expect(fixture.componentInstance.value()).toBe(100);
    key('ArrowRight');
    expect(fixture.componentInstance.value()).toBe(100);
    key('PageDown');
    expect(fixture.componentInstance.value()).toBe(50);
    key('Home');
    expect(fixture.componentInstance.value()).toBe(0);
  });

  it('dragged, the thumb is glass and the value follows the pointer, on its steps', () => {
    const { fixture, track } = make(0);
    track.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 40, right: 200, bottom: 40, x: 0, y: 0, toJSON: () => ({}) });
    track.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 103 }));
    fixture.detectChanges();
    expect(track.classList.contains('active')).toBe(true);
    expect(fixture.componentInstance.value()).toBe(50);
    track.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 150 }));
    track.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    expect(fixture.componentInstance.value()).toBe(75);
  });
});

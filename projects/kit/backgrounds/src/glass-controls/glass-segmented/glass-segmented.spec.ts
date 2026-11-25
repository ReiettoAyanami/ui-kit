import { TestBed } from '@angular/core/testing';

import { LenziGlassSegmented } from './glass-segmented';

describe('LenziGlassSegmented', () => {
  function make() {
    const fixture = TestBed.createComponent(LenziGlassSegmented<string>);
    fixture.componentRef.setInput('label', 'Period');
    fixture.componentRef.setInput('options', [
      { value: 'day', label: 'day' },
      { value: 'week', label: 'week' },
      { value: 'month', label: 'month' },
    ]);
    fixture.componentRef.setInput('value', 'day');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const segments = () => Array.from(element.querySelectorAll<HTMLButtonElement>('button.segment'));
    return { fixture, element, segments };
  }

  it('is a group of radios, the chosen one checked', () => {
    const { element, segments } = make();
    expect(element.querySelector('[role=radiogroup]')?.getAttribute('aria-label')).toBe('Period');
    expect(segments().map((s) => s.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
  });

  it('a tap on another moves there, glass on its way; a tap on the chosen goes to the next, round', () => {
    const { fixture, element, segments } = make();
    segments()[2]!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('month');
    expect(element.querySelector('.track')?.classList.contains('moving')).toBe(true);
    segments()[2]!.click();
    expect(fixture.componentInstance.value()).toBe('day');
    segments()[0]!.click();
    expect(fixture.componentInstance.value()).toBe('week');
  });

  it('the arrow keys move it, round', () => {
    const { fixture, element } = make();
    const track = element.querySelector<HTMLElement>('.track')!;
    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(fixture.componentInstance.value()).toBe('month');
    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(fixture.componentInstance.value()).toBe('day');
  });
});

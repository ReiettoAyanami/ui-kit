import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziFigure } from './figure';

@Component({
  imports: [LenziFigure],
  template: `<lenzi-figure label="Last price"><span class="inside">delta: -6%</span></lenzi-figure>`,
})
class WithContent {}

describe('LenziFigure', () => {
  function figure(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(LenziFigure);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('puts what it is on top and the value under it, as a definition', () => {
    const element = figure({ label: 'Stock', value: '264 g' });
    expect(element.querySelector('dt')?.textContent?.trim()).toBe('Stock');
    expect(element.querySelector('dd.value')?.textContent?.trim()).toBe('264 g');
    expect(element.querySelector('.description')).toBeNull();
  });

  it('says "—" without a value, and explains itself when given a description', () => {
    const element = figure({ label: 'Average per day', value: null, description: 'What was used on an average day of the period.' });
    expect(element.querySelector('dd.value')?.textContent?.trim()).toBe('—');
    expect(element.querySelector('.description')?.textContent?.trim()).toBe('What was used on an average day of the period.');
  });

  it('something projected is the value: no "—" beside it', () => {
    const fixture = TestBed.createComponent(WithContent);
    fixture.detectChanges();
    const value = (fixture.nativeElement as HTMLElement).querySelector('dd.value')!;
    expect(value.querySelector('.inside')?.textContent).toBe('delta: -6%');
    const dash = value.querySelector<HTMLElement>('.none');
    expect(dash === null || getComputedStyle(dash).display === 'none').toBe(true);
  });
});

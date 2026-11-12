import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziFigure } from './figure';
import { LenziFigureGrid } from './figure-grid';

@Component({
  imports: [LenziFigure, LenziFigureGrid],
  template: `<lenzi-figure-grid><lenzi-figure label="Stock" value="264 g" /><lenzi-figure label="Spent" value="€20.00" /></lenzi-figure-grid>`,
})
class Host {}

describe('LenziFigureGrid', () => {
  it('holds its figures', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('lenzi-figure-grid lenzi-figure').length).toBe(2);
  });
});

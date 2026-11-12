import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { KitFigure } from './figure';
import { KitFigureGrid } from './figure-grid';

@Component({
  imports: [KitFigure, KitFigureGrid],
  template: `<kit-figure-grid><kit-figure label="Stock" value="264 g" /><kit-figure label="Spent" value="€20.00" /></kit-figure-grid>`,
})
class Host {}

describe('KitFigureGrid', () => {
  it('holds its figures', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('kit-figure-grid kit-figure').length).toBe(2);
  });
});

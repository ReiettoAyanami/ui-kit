import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziScare } from './scare';
import { LenziScares } from './scares';

@Component({
  imports: [LenziScare],
  template: `@if (shown) {
    <div lenziScare [scareRadius]="50"></div>
  }`,
})
class Host {
  shown = true;
}

describe('LenziScares', () => {
  it('gives every scaring element as a circle round its box, its fear reaching beyond its edge', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element = (fixture.nativeElement as HTMLElement).querySelector('div')!;
    element.getBoundingClientRect = () => new DOMRect(100, 200, 40, 20);
    const scares = TestBed.inject(LenziScares);
    expect(scares.circles()).toEqual([{ x: 120, y: 210, radius: 70 }]);
    fixture.componentInstance.shown = false;
    fixture.changeDetectorRef.detectChanges();
    expect(scares.circles()).toEqual([]);
  });
});

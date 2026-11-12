import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { identityColor } from '../identity-dot/identity-color';
import { LenziOnlySegment, LenziSegment, LenziSegmentedBar } from './segmented-bar';

@Component({
  imports: [LenziSegmentedBar],
  template: `
    <div (click)="parent = parent + 1">
      <lenzi-segmented-bar
        label="Stock: 150 g"
        [segments]="segments"
        max="200"
        [only]="only"
        [selectable]="selectable"
        [colorOffset]="0.5"
        (segmentSelect)="selected.push($event)"
      />
    </div>
  `,
})
class Host {
  segments: LenziSegment[] = [
    { id: 1, value: '100.000', label: 'Peroni', detail: '€1.20/bottiglia' },
    { id: 2, value: '50', label: null },
  ];
  only: LenziOnlySegment | null = null;
  selectable = false;
  selected: (string | number)[] = [];
  parent = 0;
}

describe('LenziSegmentedBar', () => {
  function bar(change: (host: Host) => void = () => undefined) {
    const fixture = TestBed.createComponent(Host);
    change(fixture.componentInstance);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element, segments: Array.from(element.querySelectorAll<HTMLElement>('.segment')) };
  }

  it('draws each segment as wide as its share of the whole, in its identity colour', () => {
    const { element, segments } = bar();
    expect(element.querySelector('.track')?.getAttribute('aria-label')).toBe('Stock: 150 g');
    expect(element.querySelector('.track')?.getAttribute('role')).toBe('img');
    expect(segments.map((s) => s.style.flexBasis)).toEqual(['50%', '25%']);
    expect(segments[0]!.style.backgroundColor).toBe(identityColor(1, 0.5));
  });

  it('draws one segment alone out of its own whole, the others away', () => {
    const { segments } = bar((host) => (host.only = { id: 2, value: 30, max: 60 }));
    expect(segments.map((s) => s.style.flexBasis)).toEqual(['0%', '50%']);
    expect(segments[0]!.classList.contains('away')).toBe(true);
  });

  it('selectable, a tap on a segment says which and goes no further; from the keyboard too', () => {
    const { fixture, segments } = bar((host) => (host.selectable = true));
    segments[1]!.click();
    expect(fixture.componentInstance.selected).toEqual([2]);
    expect(fixture.componentInstance.parent).toBe(0);
    expect(segments[0]!.getAttribute('aria-label')).toBe('Select Peroni');
    expect(segments[1]!.getAttribute('aria-label')).toBe('Select Unnamed');
    segments[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(fixture.componentInstance.selected).toEqual([2, 1]);
  });

  it('not selectable, a tap reaches the parent', () => {
    const { fixture, segments } = bar();
    segments[0]!.click();
    expect(fixture.componentInstance.selected).toEqual([]);
    expect(fixture.componentInstance.parent).toBe(1);
  });
});

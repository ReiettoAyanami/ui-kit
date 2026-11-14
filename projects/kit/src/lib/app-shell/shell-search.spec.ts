import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziShellSearch } from './shell-search';

@Component({
  imports: [LenziShellSearch],
  template: `<div lenziShellSearch style="margin-left: 30px">search</div>`,
})
class Host {}

describe('LenziShellSearch', () => {
  it('marks its element for the shell and keeps where it sits in the page', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement.querySelector('[lenziShellSearch]') as HTMLElement;
    expect(element.classList).toContain('lenzi-shell-search');
    const left = element.style.getPropertyValue('--lenzi-shell-search-left');
    expect(left).toMatch(/^\d+px$/);
    expect(parseFloat(left)).toBe(Math.round(element.getBoundingClientRect().left));
  });
});

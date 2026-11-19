import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziSolidText } from './solid-text';

@Component({
  imports: [LenziSolidText],
  template: `<div lenziSolidText><h2>Lorem</h2><p>Ipsum dolor</p></div>`,
})
class Host {}

describe('LenziSolidText', () => {
  it('makes the words solid: the page\'s surface, and nothing else round them', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector('[lenziSolidText]') as HTMLElement;
    expect(element.classList).toContain('lenzi-solid-text');
    expect(element.children.length).toBe(2);
  });
});

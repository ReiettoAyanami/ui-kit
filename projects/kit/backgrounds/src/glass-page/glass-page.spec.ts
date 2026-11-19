import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziBackgroundPresence } from '../background-presence/background-presence';
import { LenziGlassPage } from './glass-page';

@Component({
  imports: [LenziGlassPage],
  template: '<main class="page" lenziGlassPage><h1>A page</h1><p>Its text</p></main>',
})
class APage {}

describe('LenziGlassPage', () => {
  it('a page over a background has the glass pane behind its elements; without one, nothing changes', async () => {
    const fixture = TestBed.createComponent(APage);
    const stable = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    };
    await stable();
    const main = (fixture.nativeElement as HTMLElement).querySelector('main')!;
    // its elements are its own, in their order
    expect([...main.children].map((child) => child.tagName)).toEqual(['H1', 'P']);
    expect(main.classList.contains('lenzi-glass-page')).toBe(false);

    const gone = TestBed.inject(LenziBackgroundPresence).add();
    await stable();
    const pane = main.querySelector('.pane');
    expect(pane).not.toBeNull();
    // first, behind the rest; lit glass; nothing for a screen reader
    expect(main.firstElementChild).toBe(pane);
    expect(pane!.classList.contains('lenzi-lit')).toBe(true);
    expect(pane!.getAttribute('aria-hidden')).toBe('true');
    expect(main.classList.contains('lenzi-glass-page')).toBe(true);
    expect(main.querySelector('h1')?.textContent).toBe('A page');

    gone();
    await stable();
    expect(main.querySelector('.pane')).toBeNull();
    expect(main.classList.contains('lenzi-glass-page')).toBe(false);
  });
});

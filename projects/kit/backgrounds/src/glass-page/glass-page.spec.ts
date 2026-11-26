import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziAppShell } from '@lenzi/ui-kit';

import { LenziBackgroundPresence } from '../background-presence/background-presence';
import { LenziGlassPage } from './glass-page';

@Component({
  imports: [LenziGlassPage],
  template: '<main class="page" lenziGlassPage><h1>A page</h1><p>Its text</p></main>',
})
class APage {}

@Component({
  imports: [LenziGlassPage],
  template: '<main class="page" lenziGlassPage><p>Its text</p></main>',
})
class UntitledPage {}

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

  it("with the shell's bar of pages, the title is the page's, at the top of its column; a page's own h1 wins (2026-11-26)", async () => {
    // lenzi, 2026-11-25: "togli la barra sopra che non ha senso, metti un titolo normale un po' grande"
    const shell = { tabs: signal(true), shownTitle: signal<string | null>('Components') };
    TestBed.configureTestingModule({ providers: [{ provide: LenziAppShell, useValue: shell }] });
    const untitled = TestBed.createComponent(UntitledPage);
    untitled.detectChanges();
    await untitled.whenStable();
    const main = (untitled.nativeElement as HTMLElement).querySelector('main')!;
    expect(main.querySelector('h1.lenzi-glass-page-title')?.textContent?.trim()).toBe('Components');
    expect(main.classList.contains('lenzi-glass-page-titled')).toBe(true);
    // with a top bar (the drawer), the title is the bar's
    shell.tabs.set(false);
    untitled.detectChanges();
    await untitled.whenStable();
    expect(main.querySelector('.lenzi-glass-page-title')).toBeNull();
    shell.tabs.set(true);
    // a page with its own h1: this one is there but hidden by the page's CSS (`:has`), the page's shows
    const titled = TestBed.createComponent(APage);
    titled.detectChanges();
    await titled.whenStable();
    const own = (titled.nativeElement as HTMLElement).querySelector('main')!;
    expect([...own.querySelectorAll('h1')].map((h) => h.textContent?.trim())).toEqual(['Components', 'A page']);
  });
});

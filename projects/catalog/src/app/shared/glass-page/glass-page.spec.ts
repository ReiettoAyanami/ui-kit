import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziScene } from '@lenzi/ui-kit/backgrounds';

import { HOME_SCENE } from '../../scenes';
import { CurrentBackground } from '../current-background';
import { GlassPage } from './glass-page';

@Component({
  imports: [GlassPage],
  template: '<main class="page" appGlassPage><h1>A page</h1><p>Its text</p></main>',
})
class APage {}

describe('GlassPage', () => {
  it('a page over a background has the glass pane behind its elements; without one, nothing changes', async () => {
    const scene = signal<LenziScene | null>(null);
    TestBed.configureTestingModule({ providers: [{ provide: CurrentBackground, useValue: { scene } }] });
    const fixture = TestBed.createComponent(APage);
    fixture.detectChanges();
    await fixture.whenStable();
    const main = (fixture.nativeElement as HTMLElement).querySelector('main')!;
    // its elements are its own, in their order
    expect([...main.children].map((child) => child.tagName)).toEqual(['H1', 'P']);
    expect(main.classList.contains('app-glass-page')).toBe(false);

    scene.set(HOME_SCENE);
    fixture.detectChanges();
    await fixture.whenStable();
    const pane = main.querySelector('.pane');
    expect(pane).not.toBeNull();
    // first, behind the rest; lit glass; nothing for a screen reader
    expect(main.firstElementChild).toBe(pane);
    expect(pane!.hasAttribute('lenziLit') || pane!.classList.length > 1).toBe(true);
    expect(pane!.getAttribute('aria-hidden')).toBe('true');
    expect(main.classList.contains('app-glass-page')).toBe(true);
    expect(main.querySelector('h1')?.textContent).toBe('A page');

    scene.set(null);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(main.querySelector('.pane')).toBeNull();
  });
});

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { LenziNavEntry } from '@lenzi/ui-kit';

import { LenziGlassTabBar } from './glass-tab-bar';

@Component({ template: '' })
class Page {}

describe('LenziGlassTabBar', () => {
  const pages: LenziNavEntry[] = [
    { label: 'Overview', icon: 'home', link: '/' },
    { label: 'Components', icon: 'widgets', link: '/components' },
  ];
  const bottom: LenziNavEntry[] = [{ label: 'Sign out', icon: 'logout', id: 'sign-out' }];

  async function make() {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '', component: Page }, { path: 'components', component: Page }, { path: 'components/:id', component: Page }])],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    const fixture = TestBed.createComponent(LenziGlassTabBar);
    fixture.componentRef.setInput('pages', pages);
    fixture.componentRef.setInput('bottom', bottom);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const tabs = () => Array.from(element.querySelectorAll<HTMLElement>('.pages .tab'));
    return { fixture, router, element, tabs };
  }

  it('is a navigation with a tab per page, the current one marked, also on a child page', async () => {
    const { fixture, router, element, tabs } = await make();
    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe('Pages');
    expect(tabs().map((tab) => tab.textContent?.trim())).toEqual(['homeOverview', 'widgetsComponents']);
    expect(tabs()[0]!.getAttribute('aria-current')).toBe('page');
    await router.navigateByUrl('/components/switch');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(tabs()[1]!.classList.contains('current')).toBe(true);
    expect(tabs()[0]!.classList.contains('current')).toBe(false);
  });

  it('on its way to another page its capsule is glass', async () => {
    const { fixture, router, element } = await make();
    await router.navigateByUrl('/components');
    fixture.detectChanges();
    expect(element.querySelector('.capsule.pages')?.classList.contains('moving')).toBe(true);
  });

  it('the rest apart, a button says its id', async () => {
    const { fixture, element } = await make();
    const pressed: string[] = [];
    fixture.componentInstance.pressed.subscribe((id) => pressed.push(id));
    element.querySelector<HTMLButtonElement>('.rest button')!.click();
    expect(pressed).toEqual(['sign-out']);
  });

  it('upright: a column, the capsule moved down by translate and as tall as a tab (2026-11-25)', async () => {
    const { fixture, element } = await make();
    expect(element.classList.contains('upright')).toBe(false);
    fixture.componentRef.setInput('orientation', 'vertical');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.classList.contains('upright')).toBe(true);
    const pill = element.querySelector<HTMLElement>('.pill')!;
    // never by left or top: the browser moves a translate apart from the page (lenzi, 2026-11-25: "L'animazione del menu lagga")
    expect(pill.style.left).toBe('');
    expect(pill.style.top).toBe('');
    expect(pill.style.translate).toMatch(/^0(px)? -?\d+(\.\d+)?px$/);
    expect(pill.style.height).not.toBe('');
  });

  it('the capsule sets off at the tap, before the page is there; back where it was if the page never comes', async () => {
    const { fixture, router, element, tabs } = await make();
    // a tap: the capsule goes at once, while the router has not even started
    tabs()[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(tabs()[1]!.classList.contains('current')).toBe(true);
    expect(element.querySelector('.capsule.pages')?.classList.contains('moving')).toBe(true);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/components');
    expect(tabs()[1]!.classList.contains('current')).toBe(true);
    // a page that refuses (a guard): the capsule goes back to the page that is still the current one
    router.resetConfig([{ path: '', component: Page }, { path: 'components', component: Page }, { path: 'components/:id', component: Page, canActivate: [() => false] }]);
    await router.navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(tabs()[0]!.classList.contains('current')).toBe(true);
    fixture.componentRef.setInput('pages', [...pages, { label: 'Switch', icon: 'toggle_on', link: '/components/switch', exact: true }]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    tabs()[2]!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(tabs()[2]!.classList.contains('current')).toBe(true);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/');
    expect(tabs()[0]!.classList.contains('current')).toBe(true);
    expect(tabs()[2]!.classList.contains('current')).toBe(false);
  });
});

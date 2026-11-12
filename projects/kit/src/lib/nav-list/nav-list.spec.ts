import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';

import { LenziAppShell } from '../app-shell/app-shell';
import { LenziNavEntry, LenziNavList } from './nav-list';

@Component({ template: '' })
class Blank {}

describe('LenziNavList', () => {
  const pages: LenziNavEntry[] = [
    { label: 'Consumptions', icon: 'history', link: '/' },
    { label: 'Substances', icon: 'inventory_2', link: '/substances' },
  ];
  const bottom: LenziNavEntry[] = [
    { label: 'Sign out', icon: 'logout', id: 'sign-out' },
    { label: 'Settings', icon: 'settings', link: '/settings' },
  ];
  let closed: number;

  async function list(url: string) {
    closed = 0;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Blank },
          { path: 'substances', component: Blank },
          { path: 'substances/:id', component: Blank },
          { path: 'settings', component: Blank },
        ]),
        { provide: LenziAppShell, useValue: { closeNav: () => closed++ } },
      ],
    });
    await TestBed.inject(Router).navigateByUrl(url);
    const fixture = TestBed.createComponent(LenziNavList);
    fixture.componentRef.setInput('appName', 'Substance tracker');
    fixture.componentRef.setInput('subtitle', 'lenzi');
    fixture.componentRef.setInput('pages', pages);
    fixture.componentRef.setInput('bottom', bottom);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  const current = (element: HTMLElement) => element.querySelector('[aria-current="page"]')?.textContent?.trim();

  it('shows the name, who is signed in, the pages, and the rest at the bottom', async () => {
    const { element } = await list('/');
    expect(element.querySelector('.app-name')?.textContent?.trim()).toBe('Substance tracker');
    expect(element.querySelector('.subtitle')?.textContent?.trim()).toBe('lenzi');
    const entries = Array.from(element.querySelectorAll('[mat-list-item]')).map((e) => e.textContent?.trim());
    expect(entries).toEqual(['historyConsumptions', 'inventory_2Substances', 'logoutSign out', 'settingsSettings']);
  });

  it('highlights the start page on its exact address only, the others also on their child routes', async () => {
    expect(current((await list('/')).element)).toBe('historyConsumptions');
    TestBed.resetTestingModule();
    expect(current((await list('/substances/5')).element)).toBe('inventory_2Substances');
  });

  it('a tap on a link closes the drawer of its shell; a button entry says which action', async () => {
    const { fixture, element } = await list('/');
    const pressed: string[] = [];
    fixture.componentInstance.pressed.subscribe((id) => pressed.push(id));

    element.querySelector<HTMLAnchorElement>('a[href="/substances"]')!.click();
    expect(closed).toBe(1);
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes('Sign out'))!.click();
    expect(pressed).toEqual(['sign-out']);
    expect(closed).toBe(1);
  });
});

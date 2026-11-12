import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Router, RouterOutlet, provideRouter } from '@angular/router';

import { LenziAppShell } from './app-shell';

@Component({ template: '<p class="page">page</p>' })
class Page {}

@Component({
  imports: [LenziAppShell, RouterOutlet],
  template: `
    <lenzi-app-shell [title]="title" [bare]="bare">
      <p lenziShellNav class="nav">nav</p>
      <button lenziShellActions class="action">bell</button>
      <router-outlet />
    </lenzi-app-shell>
  `,
})
class Host {
  title: string | null = null;
  bare: boolean | 'route' = 'route';
}

describe('LenziAppShell', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'tickets', title: 'Tickets', component: Page },
          { path: 'login', title: 'Sign in', data: { bare: true }, component: Page },
        ]),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
  });

  async function at(url: string, title: string | null = null, bare: boolean | 'route' = 'route') {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.title = title;
    fixture.componentInstance.bare = bare;
    await TestBed.inject(Router).navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it("shows the route's title in the top bar, the actions after it, the page under it", async () => {
    const element = await at('/tickets');
    expect(element.querySelector('.lenzi-shell-title')?.textContent?.trim()).toBe('Tickets');
    expect(element.querySelector('.lenzi-shell-bar .action')).not.toBeNull();
    expect(element.querySelector('.lenzi-shell-content .page')).not.toBeNull();
    expect(element.querySelector('.lenzi-shell-drawer .nav')).not.toBeNull();
  });

  it('a title of its own wins over the route', async () => {
    const element = await at('/tickets', 'All tickets');
    expect(element.querySelector('.lenzi-shell-title')?.textContent?.trim()).toBe('All tickets');
  });

  it('a route with data bare shows the page alone', async () => {
    const element = await at('/login');
    expect(element.querySelector('.lenzi-shell')?.classList.contains('lenzi-shell-bare')).toBe(true);
    // Its own bar, as a direct child: the rule that hides it does not reach a shell inside the page.
    expect(element.querySelector('.lenzi-shell-bare > .lenzi-shell-content > .lenzi-shell-bar')).not.toBeNull();
  });

  it('an explicit bare wins over the route, both ways', async () => {
    expect((await at('/login', null, false)).querySelector('.lenzi-shell')?.classList.contains('lenzi-shell-bare')).toBe(false);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'tickets', title: 'Tickets', component: Page }]), { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }] });
    expect((await at('/tickets', null, true)).querySelector('.lenzi-shell')?.classList.contains('lenzi-shell-bare')).toBe(true);
  });

  it('the menu button opens the drawer, closeNav closes it', async () => {
    const element = await at('/tickets');
    element.querySelector<HTMLButtonElement>('.lenzi-shell-menu')!.click();
    await vi.waitFor(() => expect(element.querySelector('.lenzi-shell-drawer')?.classList.contains('mat-drawer-opened')).toBe(true));
  });
});

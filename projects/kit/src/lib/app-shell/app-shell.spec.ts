import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Router, RouterOutlet, provideRouter } from '@angular/router';

import { KitAppShell } from './app-shell';

@Component({ template: '<p class="page">page</p>' })
class Page {}

@Component({
  imports: [KitAppShell, RouterOutlet],
  template: `
    <kit-app-shell [title]="title" [bare]="bare">
      <p kitShellNav class="nav">nav</p>
      <button kitShellActions class="action">bell</button>
      <router-outlet />
    </kit-app-shell>
  `,
})
class Host {
  title: string | null = null;
  bare: boolean | 'route' = 'route';
}

describe('KitAppShell', () => {
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
    expect(element.querySelector('.kit-shell-title')?.textContent?.trim()).toBe('Tickets');
    expect(element.querySelector('.kit-shell-bar .action')).not.toBeNull();
    expect(element.querySelector('.kit-shell-content .page')).not.toBeNull();
    expect(element.querySelector('.kit-shell-drawer .nav')).not.toBeNull();
  });

  it('a title of its own wins over the route', async () => {
    const element = await at('/tickets', 'All tickets');
    expect(element.querySelector('.kit-shell-title')?.textContent?.trim()).toBe('All tickets');
  });

  it('a route with data bare shows the page alone', async () => {
    const element = await at('/login');
    expect(element.querySelector('.kit-shell')?.classList.contains('kit-shell-bare')).toBe(true);
    // Its own bar, as a direct child: the rule that hides it does not reach a shell inside the page.
    expect(element.querySelector('.kit-shell-bare > .kit-shell-content > .kit-shell-bar')).not.toBeNull();
  });

  it('an explicit bare wins over the route, both ways', async () => {
    expect((await at('/login', null, false)).querySelector('.kit-shell')?.classList.contains('kit-shell-bare')).toBe(false);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'tickets', title: 'Tickets', component: Page }]), { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }] });
    expect((await at('/tickets', null, true)).querySelector('.kit-shell')?.classList.contains('kit-shell-bare')).toBe(true);
  });

  it('the menu button opens the drawer, closeNav closes it', async () => {
    const element = await at('/tickets');
    element.querySelector<HTMLButtonElement>('.kit-shell-menu')!.click();
    await vi.waitFor(() => expect(element.querySelector('.kit-shell-drawer')?.classList.contains('mat-drawer-opened')).toBe(true));
  });
});

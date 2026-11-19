import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { LenziPhone } from '@lenzi/ui-kit';

import { EVERY_COMPONENT } from '../page-backgrounds';
import { PageBackground } from './page-background';

/** The scenes' check is loaded when the choices come (a dynamic import): one turn of the event loop. */
const settle = async () => {
  await import('../scene-code');
  await new Promise((resolve) => setTimeout(resolve));
};

@Component({ template: '' })
class Empty {}

describe('PageBackground', () => {
  async function open(pages: Record<string, unknown> = {}) {
    // the window, as the kit says it (lenziPhone())
    const phone = signal(false);
    TestBed.configureTestingModule({
      imports: [PageBackground],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: '', component: Empty },
          { path: 'rules', component: Empty },
          { path: 'components/:id', component: Empty },
          { path: 'scenes/maker', component: Empty },
        ]),
        { provide: LenziPhone, useValue: { matches: phone } },
      ],
    });
    // the scene is deferred (its own chunk)
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(PageBackground);
    TestBed.inject(HttpTestingController).expectOne('api/backgrounds').flush({ pages });
    await settle();
    const router = TestBed.inject(Router);
    const page = fixture.nativeElement as HTMLElement;
    const go = async (url: string) => {
      await router.navigateByUrl(url);
      fixture.detectChanges();
      await fixture.whenStable();
    };
    return { fixture, page, go, phone };
  }

  it("the overview has the home's whole scene, a phone the lighter one (only blobs); a page without one, nothing", async () => {
    const { page, go, phone } = await open();
    phone.set(false);
    await go('/');
    expect(page.querySelector('lenzi-blob-flock-background')).not.toBeNull();

    phone.set(true);
    await go('/');
    expect(page.querySelector('lenzi-blob-flock-background')).toBeNull();
    expect(page.querySelector('lenzi-blob-background')).not.toBeNull();

    await go('/rules');
    expect(page.querySelector('lenzi-scene')).toBeNull();
  });

  it("follows the page: the admin's choice for it, every component's page one; the scene maker none", async () => {
    const { page, go } = await open({
      rules: { computer: { code: 'home-phone' }, phone: 'same' },
      [EVERY_COMPONENT]: { computer: { code: 'home' }, phone: 'same' },
    });
    await go('/rules');
    expect(page.querySelector('lenzi-blob-background')).not.toBeNull();
    await go('/components/add-button');
    expect(page.querySelector('lenzi-blob-flock-background')).not.toBeNull();
    await go('/scenes/maker');
    expect(page.querySelector('lenzi-scene')).toBeNull();
  });
});

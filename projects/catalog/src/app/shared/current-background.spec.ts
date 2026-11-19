import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { LenziPhone } from '@lenzi/ui-kit';

import { HOME_PHONE_SCENE, HOME_SCENE } from '../scenes';
import { CurrentBackground } from './current-background';

@Component({ template: '' })
class Empty {}

describe('CurrentBackground', () => {
  it("is the open page's scene, on this window: the overview's, a phone's lighter one, none behind Rules", async () => {
    // the window, as the kit says it (lenziPhone())
    const phone = signal(false);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '', component: Empty }, { path: 'rules', component: Empty }]),
        { provide: LenziPhone, useValue: { matches: phone } },
      ],
    });
    const current = TestBed.inject(CurrentBackground);
    TestBed.inject(HttpTestingController).expectOne('api/backgrounds').flush({ pages: {} });
    await import('./scene-code');
    await new Promise((resolve) => setTimeout(resolve));
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/');
    phone.set(false);
    expect(current.scene()).toBe(HOME_SCENE);
    phone.set(true);
    expect(current.scene()).toBe(HOME_PHONE_SCENE);
    await router.navigateByUrl('/rules');
    expect(current.scene()).toBeNull();
  });
});

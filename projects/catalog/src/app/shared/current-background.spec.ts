import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { HOME_PHONE_SCENE, HOME_SCENE } from '../scenes';
import { CurrentBackground } from './current-background';

@Component({ template: '' })
class Empty {}

describe('CurrentBackground', () => {
  it("is the open page's scene, on this window: the overview's, a phone's lighter one, none behind Rules", async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: '', component: Empty }, { path: 'rules', component: Empty }])],
    });
    const current = TestBed.inject(CurrentBackground);
    TestBed.inject(HttpTestingController).expectOne('api/backgrounds').flush({ pages: {} });
    await import('./scene-code');
    await new Promise((resolve) => setTimeout(resolve));
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/');
    current.phone.set(false);
    expect(current.scene()).toBe(HOME_SCENE);
    current.phone.set(true);
    expect(current.scene()).toBe(HOME_PHONE_SCENE);
    await router.navigateByUrl('/rules');
    expect(current.scene()).toBeNull();
  });
});

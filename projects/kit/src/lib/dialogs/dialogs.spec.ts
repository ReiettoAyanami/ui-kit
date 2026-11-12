import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router, provideRouter } from '@angular/router';

import { LenziDialogs } from './dialogs';

@Component({ template: '<button type="button" (click)="close()">Done</button>' })
class Answering {
  private readonly ref = inject<MatDialogRef<Answering, string>>(MatDialogRef);
  close(): void {
    this.ref.close('answer');
  }
}

@Component({ template: '' })
class Blank {}

// From substance-tracker's history-dialogs.spec.ts.
describe('LenziDialogs', () => {
  let dialogs: LenziDialogs;
  let location: Location;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'page', component: Blank },
          { path: 'elsewhere', component: Blank },
          // a page whose guard takes a while, like a sign-in page's (it asks the server who this is)
          { path: 'slow', canActivate: [() => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 30))], component: Blank },
        ]),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    dialogs = TestBed.inject(LenziDialogs);
    location = TestBed.inject(Location);
  });

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((overlay) => overlay.remove()));

  it('gives a dialog its own history entry, removed when it closes some other way than back', async () => {
    const closed = dialogs.open<Answering, object, string>(Answering, {});
    expect(location.getState()).toEqual({ lenziDialog: true });

    document.querySelector<HTMLButtonElement>('mat-dialog-container button')!.click();
    expect(await closed).toBe('answer');
    expect(location.getState()).not.toEqual({ lenziDialog: true });
  });

  it('a navigation started as soon as it resolves reaches its page, also a slow one', async () => {
    const router = TestBed.inject(Router);
    location.go('/page');
    router.initialNavigation();
    await vi.waitFor(() => expect(router.url).toBe('/page'));
    const closed = dialogs.open<Answering, object, string>(Answering, {});
    document.querySelector<HTMLButtonElement>('mat-dialog-container button')!.click();
    expect(await closed).toBe('answer');

    // what Sign out does once confirmed (lenzi, 2026-10-03: signed out, the app stayed on the page):
    // the router takes the back in a later task, and that back used to cancel this navigation
    void router.navigateByUrl('/slow');
    await vi.waitFor(() => expect(router.url).toBe('/slow'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(router.url).toBe('/slow');
  });

  it('a link in the dialog to another page closes it; the page takes its history entry', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/page');
    const closed = dialogs.open<Answering, object, string>(Answering, {});
    expect(location.getState()).toEqual(expect.objectContaining({ lenziDialog: true }));

    void router.navigateByUrl('/elsewhere?section=one');
    expect(await closed).toBeUndefined();
    await vi.waitFor(() => expect(router.url).toBe('/elsewhere?section=one'));
    await vi.waitFor(() => expect(document.querySelector('mat-dialog-container')).toBeNull());
    expect(location.getState()).not.toEqual(expect.objectContaining({ lenziDialog: true }));
  });
});

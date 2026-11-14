import { TestBed } from '@angular/core/testing';

import { HomeScene } from './home-scene';

describe('HomeScene', () => {
  it("shows the home's whole scene, and the phone's lighter one (only blobs) on a phone", async () => {
    const fixture = TestBed.createComponent(HomeScene);
    fixture.componentInstance.phone.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('lenzi-blob-flock-background')).not.toBeNull();

    fixture.componentInstance.phone.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.querySelector('lenzi-blob-flock-background')).toBeNull();
    expect(page.querySelector('lenzi-blob-background')).not.toBeNull();
  });
});

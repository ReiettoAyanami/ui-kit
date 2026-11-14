// Written by hand: the component was generated without its spec.
import { TestBed } from '@angular/core/testing';

import { BlobFlockBackgroundDemo } from './blob-flock-background-demo';

describe('BlobFlockBackgroundDemo', () => {
  it('puts the background behind a lit card and a watching cat', async () => {
    const fixture = TestBed.createComponent(BlobFlockBackgroundDemo);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('lenzi-blob-flock-background')).not.toBeNull();
    expect(page.querySelector('lenzi-cat .gaze')).not.toBeNull();
  });
});

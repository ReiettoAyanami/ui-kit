import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { KitServer } from '../../shared/kit-server';
import { ScenesPage } from './scenes-page';

async function shown(admin: boolean) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: KitServer, useValue: { admin: signal(admin) } }],
  });
  const fixture = TestBed.createComponent(ScenesPage);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('ScenesPage', () => {
  it('sends a visitor to the scene maker, and only there', async () => {
    const page = await shown(false);
    expect(page.querySelector('a[href="/scenes/maker"]')).not.toBeNull();
    expect(page.querySelector('.card')).toBeNull();
  });

  it('shows the admin the scenes kept too', async () => {
    const page = await shown(true);
    const names = [...page.querySelectorAll('.card .name')].map((name) => name.textContent?.trim());
    expect(names).toEqual(['Home', 'Home on a phone']);
  });
});

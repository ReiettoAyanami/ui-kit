import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { LenziScene } from '@lenzi/ui-kit/backgrounds';

import { DOCS } from '../../registry';
import { KitServer } from '../../shared/kit-server';
import { EVERY_COMPONENT } from '../../shared/page-backgrounds';
import { PublicPages } from '../../shared/public-pages';
import { SavedScene, SavedScenes } from '../../shared/saved-scenes';
import { sitePages } from '../../site-map';
import { AdminPage } from './admin-page';

const DUSK: LenziScene = { name: 'Dusk', blobs: [{ material: 'lamp', size: 0.2 }], fleets: [] };
const KEPT: SavedScene = { id: 'dusk0001', name: 'Dusk', scene: DUSK, createdAt: '2026-11-17T12:00:00.000Z', updatedAt: '2026-11-17T12:00:00.000Z' };

/** The scenes' check is loaded when the choices come (a dynamic import): one turn of the event loop. */
const settle = async () => {
  await import('../../shared/scene-code');
  await new Promise((resolve) => setTimeout(resolve));
};

describe('AdminPage, the pages\' backgrounds', () => {
  async function open(pages: Record<string, unknown> = {}) {
    const all = sitePages(DOCS);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: KitServer, useValue: { admin: signal(true), session: signal({ configured: true, signedIn: true, user: 'lenzi', files: false }) } },
        { provide: PublicPages, useValue: { all, toggled: all.filter((page) => !page.always), hidden: signal(new Set<string>()) } },
        { provide: SavedScenes, useValue: { list: vi.fn(() => of([KEPT])) } },
      ],
    });
    const fixture = TestBed.createComponent(AdminPage);
    const server = TestBed.inject(HttpTestingController);
    server.expectOne('api/backgrounds').flush({ pages });
    await settle();
    // twice: a select shows its value once its options (in their groups) are there
    for (let round = 0; round < 2; round++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
    const page = fixture.nativeElement as HTMLElement;
    const row = (title: string) => [...page.querySelectorAll<HTMLElement>('.background')].find((found) => found.querySelector('.page-title')?.textContent?.trim() === title)!;
    const shown = (title: string) => [...row(title).querySelectorAll('mat-select')].map((select) => select.textContent?.trim());
    return { fixture, page, server, row, shown };
  }

  it("lists every page that may have one, with what it has: the catalog's own where none was chosen", async () => {
    const { page, shown } = await open({ rules: { computer: { saved: 'dusk0001', name: 'Dusk', scene: DUSK }, phone: null } });
    const titles = [...page.querySelectorAll('.background .page-title')].map((title) => title.textContent?.trim());
    expect(titles[0]).toBe('Overview');
    expect(titles).toContain('Rules');
    expect(titles).toContain("A component's page");
    expect(titles).not.toContain('Scene maker');
    expect(page.querySelector('.background:last-child .page-address')?.textContent).toBe(`/${EVERY_COMPONENT}`);
    expect(shown('Overview')).toEqual(['Home', 'Home on a phone']);
    expect(shown('Components')).toEqual(['Home', 'Home on a phone']);
    expect(shown('Rules')).toEqual(['Dusk', 'None']);
    expect(shown('History')).toEqual(['None', 'As on a computer']);
  });

  it("a page's background chosen from the code's scenes or the gallery: saved at once, for every visitor", async () => {
    const { fixture, server, row, shown } = await open();
    row('History').querySelector<HTMLElement>('mat-select .mat-mdc-select-trigger')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const options = [...document.querySelectorAll<HTMLElement>('mat-option')];
    expect(options.map((option) => option.textContent?.trim())).toEqual(['None', 'Home', 'Home on a phone', 'Dusk']);
    options.find((option) => option.textContent?.trim() === 'Dusk')!.click();
    fixture.detectChanges();
    const put = server.expectOne({ method: 'PUT', url: 'api/backgrounds' });
    expect(put.request.body).toEqual({ page: 'history', computer: { saved: 'dusk0001' }, phone: 'same' });
    put.flush({ pages: { history: { computer: { saved: 'dusk0001', name: 'Dusk', scene: DUSK }, phone: 'same' } } });
    await settle();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(shown('History')).toEqual(['Dusk', 'As on a computer']);
  });

  it('a scene taken out of the gallery is said, on its row', async () => {
    const { row, shown } = await open({ '': { computer: { saved: 'gone0001', missing: true }, phone: 'same' } });
    expect(shown('Overview')).toEqual(['Taken out of the gallery', 'As on a computer']);
    expect(row('Overview').querySelector('.hint')?.textContent).toContain('taken out of the gallery');
  });

  it('a refused choice is taken back, with the server\'s words', async () => {
    const { fixture, page, server, shown } = await open();
    const admin = fixture.componentInstance as unknown as { setBackground(key: string, on: 'computer' | 'phone', value: string): Promise<void> };
    const saving = admin.setBackground('rules', 'computer', 'code:home');
    server.expectOne({ method: 'PUT', url: 'api/backgrounds' }).flush({ title: 'Sign in first', detail: 'Only the admin changes the kit.' }, { status: 401, statusText: 'Unauthorized' });
    await saving;
    fixture.detectChanges();
    expect(shown('Rules')).toEqual(['None', 'As on a computer']);
    expect(page.querySelector('.error')?.textContent).toContain('Not saved');
  });
});

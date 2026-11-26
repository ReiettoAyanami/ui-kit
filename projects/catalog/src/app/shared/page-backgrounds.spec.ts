import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { LenziScene } from '@lenzi/ui-kit/backgrounds';

import { HOME_PHONE_SCENE, HOME_SCENE, OVERVIEW_PHONE_SCENE, OVERVIEW_SCENE } from '../scenes';
import { EVERY_COMPONENT, PageBackgrounds, backgroundKey, choiceOf, choiceValue } from './page-backgrounds';
import { SavedScene } from './saved-scenes';

const DUSK: LenziScene = { name: 'Dusk', blobs: [{ material: 'lamp', size: 0.2 }], fleets: [] };
/** The scenes' check is loaded when the choices come (a dynamic import): one turn of the event loop. */
const settle = async () => {
  await import('./scene-code');
  await new Promise((resolve) => setTimeout(resolve));
};
const KEPT: SavedScene = { id: 'dusk0001', name: 'Dusk', scene: DUSK, createdAt: '2026-11-17T12:00:00.000Z', updatedAt: '2026-11-17T12:00:00.000Z' };

describe('backgroundKey', () => {
  it("is the page's address; every component's page is one; a frame and the pages that are a scene have none", async () => {
    expect(backgroundKey('/')).toBe('');
    expect(backgroundKey('/components?q=bar')).toBe('components');
    expect(backgroundKey('/components/add-button#code')).toBe(EVERY_COMPONENT);
    expect(backgroundKey('/rules/')).toBe('rules');
    expect(backgroundKey('/frame/add-button')).toBeNull();
    expect(backgroundKey('/scenes/maker?s=z123')).toBeNull();
    expect(backgroundKey('/scene?s=z123')).toBeNull();
    expect(backgroundKey('/scenes')).toBe('scenes');
  });

  it('a choice and the value of its select go into each other', async () => {
    for (const choice of [null, { code: 'home' }, { saved: 'dusk0001' }, 'same'] as const) expect(choiceOf(choiceValue(choice))).toEqual(choice);
    expect(choiceValue(null)).toBe('none');
  });
});

describe('PageBackgrounds', () => {
  let backgrounds: PageBackgrounds;
  let server: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    backgrounds = TestBed.inject(PageBackgrounds);
    server = TestBed.inject(HttpTestingController);
  });

  afterEach(() => server.verify());

  it("draws nothing until it knows; then the catalog's own where the admin chose none: the overview's blobs, on the components too", async () => {
    expect(backgrounds.sceneFor('', false)).toBeNull();
    server.expectOne({ method: 'GET', url: 'api/backgrounds' }).flush({ pages: {} });
    await settle();
    expect(backgrounds.sceneFor('', false)).toBe(OVERVIEW_SCENE);
    expect(backgrounds.sceneFor('', true)).toBe(OVERVIEW_PHONE_SCENE);
    expect(backgrounds.sceneFor('components', false)).toBe(OVERVIEW_SCENE);
    expect(backgrounds.sceneFor('components', true)).toBe(OVERVIEW_PHONE_SCENE);
    expect(backgrounds.sceneFor('rules', false)).toBeNull();
    expect(backgrounds.sceneFor(null, false)).toBeNull();
    expect(backgrounds.of('rules')).toEqual({ computer: null, phone: 'same' });
  });

  it("the admin's choices: a scene of the gallery (checked), none, the code's; a phone as on a computer or its own", async () => {
    server.expectOne('api/backgrounds').flush({
      pages: {
        '': { computer: { saved: 'dusk0001', name: 'Dusk', scene: { ...DUSK, blobs: [{ material: 'lamp', size: 9 }] } }, phone: null },
        rules: { computer: { code: 'home' }, phone: 'same' },
        [EVERY_COMPONENT]: { computer: { code: 'home' }, phone: { code: 'home-phone' } },
        broken: { computer: 'same', phone: null },
      },
    });
    await settle();
    expect(backgrounds.sceneFor('', false)!.blobs[0]!.size).toBe(0.5);
    expect(backgrounds.sceneFor('', true)).toBeNull();
    expect(backgrounds.sceneFor('rules', true)).toBe(HOME_SCENE);
    expect(backgrounds.sceneFor(EVERY_COMPONENT, true)).toBe(HOME_PHONE_SCENE);
    expect(backgrounds.sceneFor('broken', false)).toBeNull();
    expect(backgrounds.of('')).toEqual({ computer: { saved: 'dusk0001' }, phone: null });
    expect(backgrounds.chosen('rules')).toBe(true);
    expect(backgrounds.chosen('history')).toBe(false);
  });

  it("a scene of the gallery taken out, or a name the code does not have: the page's own again, and said", async () => {
    server.expectOne('api/backgrounds').flush({
      pages: {
        '': { computer: { saved: 'gone0001', missing: true }, phone: 'same' },
        components: { computer: { code: 'renamed' }, phone: 'same' },
      },
    });
    await settle();
    expect(backgrounds.sceneFor('', false)).toBe(OVERVIEW_SCENE);
    expect(backgrounds.sceneFor('', true)).toBe(OVERVIEW_PHONE_SCENE);
    expect(backgrounds.missing('')).toEqual({ computer: true, phone: false });
    expect(backgrounds.sceneFor('components', false)).toBe(OVERVIEW_SCENE);
  });

  it("without a server: the catalog's own", async () => {
    server.expectOne('api/backgrounds').flush('no', { status: 502, statusText: 'Bad Gateway' });
    await settle();
    expect(backgrounds.sceneFor('', false)).toBe(OVERVIEW_SCENE);
  });

  it('a choice is drawn at once, with the scene of the gallery it names, then saved; taken back if refused', async () => {
    server.expectOne('api/backgrounds').flush({ pages: {} });
    await settle();
    let saved = false;
    backgrounds.set('rules', { computer: { saved: 'dusk0001' }, phone: 'same' }, [KEPT]).subscribe(() => (saved = true));
    expect(backgrounds.sceneFor('rules', true)).toBe(DUSK);
    const put = server.expectOne({ method: 'PUT', url: 'api/backgrounds' });
    expect(put.request.body).toEqual({ page: 'rules', computer: { saved: 'dusk0001' }, phone: 'same' });
    put.flush({ pages: { rules: { computer: { saved: 'dusk0001', name: 'Dusk', scene: DUSK }, phone: 'same' } } });
    await settle();
    expect(saved).toBe(true);
    expect(backgrounds.sceneFor('rules', false)).toEqual(DUSK);

    let failed = false;
    backgrounds.set('', { computer: null, phone: 'same' }).subscribe({ error: () => (failed = true) });
    expect(backgrounds.sceneFor('', false)).toBeNull();
    server.expectOne({ method: 'PUT', url: 'api/backgrounds' }).flush({ title: 'Sign in first' }, { status: 401, statusText: 'Unauthorized' });
    expect(failed).toBe(true);
    expect(backgrounds.sceneFor('', false)).toBe(OVERVIEW_SCENE);
  });

  it("lists the pages that may have one: the site map's but the scenes' own, and every component's page as one", async () => {
    server.expectOne('api/backgrounds').flush({ pages: {} });
    await settle();
    const keys = backgrounds.pages.map((page) => page.key);
    expect(keys).toContain('');
    expect(keys).toContain('rules');
    expect(keys).toContain('admin');
    expect(keys).not.toContain('scenes/maker');
    expect(keys).not.toContain('scene');
    expect(keys.at(-1)).toBe(EVERY_COMPONENT);
    expect(backgrounds.pages[0]!.title).toBe('Overview');
  });
});

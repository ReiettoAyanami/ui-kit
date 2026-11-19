import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';

import { LenziConfirmData, LenziDialogs } from '@lenzi/ui-kit';
import { LenziBackgroundPresence, LenziScene } from '@lenzi/ui-kit/backgrounds';

import { KitServer } from '../../shared/kit-server';
import { SavedScene, SavedScenes } from '../../shared/saved-scenes';
import { sceneFromCode } from '../../shared/scene-code';
import { SCENE_FRAME_READY } from '../scene-view-page/scene-view-page';
import { GALLERY_STEP, ScenesPage, sceneHolds } from './scenes-page';
import { HOME_SCENE } from '../../scenes';

const DUSK: LenziScene = { name: 'Dusk', blobs: [{ material: 'lamp', size: 0.2 }], fleets: [{ kind: 'boid', count: 80 }] };
const kept = (id: string, scene: LenziScene, day = 15): SavedScene => ({
  id,
  name: scene.name ?? '',
  scene,
  createdAt: `2026-11-${day}T12:00:00.000Z`,
  updatedAt: `2026-11-${day}T12:00:00.000Z`,
});

interface Shown {
  admin?: boolean;
  scenes?: SavedScene[];
  /** The server's answer in place of the scenes (a failure). */
  list?: Observable<SavedScene[]>;
}

async function shown({ admin = true, scenes = [kept('dusk0001', DUSK), kept('none0002', { blobs: [], fleets: [] }, 14)], list }: Shown = {}) {
  const server = {
    list: vi.fn(() => list ?? of(scenes)),
    remove: vi.fn(() => of(undefined)),
    restore: vi.fn((id: string) => of(scenes.find((scene) => scene.id === id) ?? null)),
  };
  /** The confirm dialog, confirmed: it runs its action and closes with true. */
  const dialogs = {
    open: vi.fn(async (_component: unknown, data: LenziConfirmData) => {
      await firstValueFrom(data.action() as Observable<unknown>, { defaultValue: undefined });
      return true;
    }),
  };
  const background = signal<LenziScene | null>(null);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: KitServer, useValue: { admin: signal(admin) } },
      { provide: SavedScenes, useValue: server },
      { provide: LenziDialogs, useValue: dialogs },
      // what is behind the page: none unless a test puts one
      { provide: LenziBackgroundPresence, useValue: { present: computed(() => background() !== null) } },
    ],
  });
  const fixture = TestBed.createComponent(ScenesPage);
  const page = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const cards = (section: 'saved' | 'built') => [...page.querySelectorAll<HTMLElement>(`#scenes-${section} ~ .gallery lenzi-preview-card`)];
  const titles = (section: 'saved' | 'built') => cards(section).map((card) => card.querySelector('.title')?.textContent?.trim());
  if (admin) {
    // the cards are made from the scenes (their codes are worked out in a moment), then they come into view
    await vi.waitFor(async () => {
      await settle();
      expect(cards('built').length).toBe(2);
      expect(page.querySelector('lenzi-status-message[kind="loading"]')).toBeNull();
    });
  }
  await settle();
  /** Opens a card's ⋮ and chooses one of its actions. */
  const choose = async (card: HTMLElement, action: string) => {
    card.querySelector<HTMLButtonElement>('lenzi-card-menu button')!.click();
    await settle();
    [...document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-panel button')].find((item) => item.textContent?.includes(action))!.click();
    await settle();
  };
  return { fixture, page, server, dialogs, cards, titles, choose, settle, background };
}

describe('ScenesPage', () => {
  it("over a background the cards and their ⋮ are lit; without one, as they were (2026-11-17)", async () => {
    const { cards, settle, background } = await shown();
    const lit = () => cards('built').map((card) => [card.classList.contains('lenzi-lit'), card.querySelector('lenzi-card-menu')!.classList.contains('lenzi-lit')]);
    expect(lit()).toEqual([[false, false], [false, false]]);
    background.set(HOME_SCENE);
    await settle();
    expect(lit()).toEqual([[true, true], [true, true]]);
  });

  it('sends a visitor to the scene maker, and only there', async () => {
    const { page, server } = await shown({ admin: false });
    expect(page.querySelector('a[href="/scenes/maker"]')).not.toBeNull();
    expect(page.querySelector('lenzi-preview-card')).toBeNull();
    expect(server.list).not.toHaveBeenCalled();
  });

  it('shows the admin the scenes kept, a preview card each, then the scenes of the code', async () => {
    const { page, cards, titles } = await shown();
    expect(page.querySelector('a[href="/scenes/maker"]')).not.toBeNull();
    expect(titles('saved')).toEqual(['Dusk', 'A scene without a name']);
    expect(titles('built')).toEqual(['Home', 'Home on a phone']);
    const lines = (card: HTMLElement) => [...card.querySelectorAll('.line')].map((line) => line.textContent?.trim());
    expect(lines(cards('saved')[0]!)).toEqual(['1 blob, 1 fleet', 'Saved on 15 November 2026']);
    expect(lines(cards('saved')[1]!)).toEqual(['no blobs, no fleets', 'Saved on 14 November 2026']);
    expect(lines(cards('built')[1]!)).toEqual(['3 blobs, no fleets', 'In the code: HOME_PHONE_SCENE']);
  });

  it("each card frames its scene alone, still: the link's code is the scene", async () => {
    const { cards } = await shown();
    const frame = cards('saved')[0]!.querySelector<HTMLIFrameElement>('iframe')!;
    const address = new URL(frame.src);
    expect(address.pathname).toBe('/scene');
    expect(address.searchParams.has('still')).toBe(true);
    expect(await sceneFromCode(address.searchParams.get('s'))).toEqual(DUSK);
    expect(frame.title).toBe('Dusk');
    expect(frame.getAttribute('tabindex')).toBe('-1');
  });

  it("a card's scene plays only while the card is pointed at; a frame ready later is told then", async () => {
    const { cards, settle } = await shown();
    const card = cards('saved')[0]!;
    const frame = card.querySelector<HTMLIFrameElement>('iframe')!;
    const told: unknown[] = [];
    const inside = { postMessage: (message: unknown) => told.push(message) };
    Object.defineProperty(frame, 'contentWindow', { value: inside });
    const ready = () => {
      const event = new MessageEvent('message', { data: { type: SCENE_FRAME_READY } });
      Object.defineProperty(event, 'source', { value: inside });
      window.dispatchEvent(event);
    };

    card.dispatchEvent(new Event('pointerenter'));
    await settle();
    expect(told).toEqual([{ type: 'lenzi-scene-play', play: true }]);
    // the scene in the frame starts listening only now: it is told what the card is
    ready();
    expect(told.length).toBe(2);
    expect(told.at(-1)).toEqual({ type: 'lenzi-scene-play', play: true });
    card.dispatchEvent(new Event('pointerleave'));
    await settle();
    expect(told.at(-1)).toEqual({ type: 'lenzi-scene-play', play: false });
    ready();
    expect(told.length).toBe(4);
    expect(told.at(-1)).toEqual({ type: 'lenzi-scene-play', play: false });
  });

  it('a tap on a card opens its scene in the maker; a kept one with its id, so Save saves it again', async () => {
    const { cards } = await shown();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    cards('saved')[0]!.querySelector<HTMLButtonElement>('.open')!.click();
    const [commands, extras] = navigate.mock.calls[0]!;
    expect(commands).toEqual(['/scenes/maker']);
    expect(extras?.queryParams?.['id']).toBe('dusk0001');
    expect(await sceneFromCode(extras?.queryParams?.['s'])).toEqual(DUSK);

    cards('built')[0]!.querySelector<HTMLButtonElement>('.open')!.click();
    expect(navigate.mock.calls[1]![1]?.queryParams?.['id']).toBeUndefined();
  });

  it('Delete asks first, takes the scene out, and Undo puts it back; a scene of the code cannot be deleted', async () => {
    const { cards, titles, choose, server, dialogs, settle } = await shown();
    await choose(cards('saved')[0]!, 'Delete');
    expect(dialogs.open).toHaveBeenCalledTimes(1);
    expect(dialogs.open.mock.calls[0]![1].title).toBe('Delete “Dusk”?');
    await vi.waitFor(async () => {
      await settle();
      expect(titles('saved')).toEqual(['A scene without a name']);
    });
    expect(server.remove).toHaveBeenCalledWith('dusk0001');

    [...document.querySelectorAll<HTMLButtonElement>('mat-snack-bar-container button')].find((button) => button.textContent?.includes('Undo'))!.click();
    await vi.waitFor(async () => {
      await settle();
      expect(server.restore).toHaveBeenCalledWith('dusk0001');
      expect(titles('saved')).toEqual(['Dusk', 'A scene without a name']);
    });

    cards('built')[0]!.querySelector<HTMLButtonElement>('lenzi-card-menu button')!.click();
    await settle();
    const offered = [...document.querySelectorAll('.mat-mdc-menu-panel')].at(-1)!.textContent ?? '';
    expect(offered).not.toContain('Delete');
    expect(offered).toContain('Copy the link');
  });

  it('a few at a time: "Show more" brings the next ones', async () => {
    const many = Array.from({ length: GALLERY_STEP + 3 }, (_, i) => kept(`scene${String(i).padStart(3, '0')}`, { ...DUSK, name: `Scene ${i + 1}` }));
    const { page, cards, settle } = await shown({ scenes: many });
    expect(cards('saved').length).toBe(GALLERY_STEP);
    [...page.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes('Show more'))!.click();
    await settle();
    expect(cards('saved').length).toBe(GALLERY_STEP + 3);
    expect([...page.querySelectorAll('button')].some((button) => button.textContent?.includes('Show more'))).toBe(false);
  });

  it('says so when there is none yet', async () => {
    const { page } = await shown({ scenes: [] });
    expect(page.querySelector('#scenes-saved ~ lenzi-status-message')?.textContent).toContain('No scenes kept yet');
  });

  it('says why when they cannot be loaded', async () => {
    const { page } = await shown({ list: throwError(() => ({ status: 500, title: 'Internal Server Error' })) });
    expect(page.querySelector('#scenes-saved ~ lenzi-status-message')?.textContent).toContain('Could not load the scenes: Internal Server Error (500)');
  });

  it('what a scene holds, in a line', () => {
    expect(sceneHolds(DUSK)).toBe('1 blob, 1 fleet');
    expect(sceneHolds({ blobs: [], fleets: [] })).toBe('no blobs, no fleets');
  });
});

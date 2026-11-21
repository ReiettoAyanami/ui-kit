import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LenziScene, blobHome } from '@lenzi/ui-kit/backgrounds';

import { HOME_SCENE } from '../../scenes';
import { KitServer } from '../../shared/kit-server';
import { SavedScene, SavedScenes } from '../../shared/saved-scenes';
import { SceneMakerPage, bodyOf, emitsOf, fleetDefault, followOf, layerOf, lookFor, placed } from './scene-maker-page';

/** The gallery's server, as the maker uses it: it keeps what it is given and says what it was asked. */
function gallery() {
  const kept = (id: string, scene: LenziScene): SavedScene => ({ id, name: scene.name ?? '', scene, createdAt: '2026-11-15T12:00:00.000Z', updatedAt: '2026-11-15T12:00:00.000Z' });
  return {
    list: vi.fn(() => of<SavedScene[]>([])),
    add: vi.fn((scene: LenziScene) => of(kept('new00001', scene))),
    update: vi.fn((id: string, scene: LenziScene) => of(kept(id, scene))),
  };
}

async function open({ admin = false, scenes = gallery() } = {}) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: KitServer, useValue: { admin: signal(admin) } }, { provide: SavedScenes, useValue: scenes }],
  });
  const fixture = TestBed.createComponent(SceneMakerPage);
  fixture.detectChanges();
  await fixture.whenStable();
  const page = fixture.nativeElement as HTMLElement;
  const click = async (text: string) => {
    const button = [...page.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(text));
    if (!button) throw new Error(`no button "${text}"`);
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { fixture, page, click, maker: fixture.componentInstance, scenes };
}

describe('SceneMakerPage', () => {
  it("lists the scene's objects on the left, each with its icon: the scene, its blobs, its fleets' leaders", async () => {
    const { page } = await open();
    const titles = [...page.querySelectorAll('mat-action-list [matListItemTitle]')].map((title) => title.textContent?.trim());
    expect(titles[0]).toBe('Home');
    expect(titles.filter((title) => title?.endsWith('blob')).length).toBe(HOME_SCENE.blobs.length);
    expect(titles.filter((title) => title === 'Boids' || title?.endsWith('blob-boids')).length).toBe(HOME_SCENE.fleets.length);
    expect(page.querySelectorAll('mat-action-list [matListItemIcon]').length).toBe(titles.length);
    expect(page.querySelector('lenzi-scene')).not.toBeNull();
  });

  it('each row shows its level and a button that takes its object out; the open window stays on its object; Undo puts it back', async () => {
    const { page, click, maker, fixture } = await open();
    const rows = () => [...page.querySelectorAll<HTMLElement>('mat-action-list .object')];
    const row = (title: string) => rows().find((found) => found.querySelector('[matListItemTitle]')?.textContent?.trim() === title)!;
    // the scene's own row: no level, nothing to take out
    expect(rows()[0]!.querySelector('.level')).toBeNull();
    expect(rows()[0]!.querySelector('.take-out')).toBeNull();
    // glass is a level above the rest
    expect(row('Glass blob').querySelector('.level')?.textContent).toContain('1');
    expect(row('Glass blob').querySelector('.level')?.getAttribute('aria-label')).toBe('Level 1');
    expect(row('Glowing blob').querySelector('.level')?.textContent).toContain('0');
    expect(page.querySelectorAll('mat-action-list .take-out').length).toBe(HOME_SCENE.blobs.length + HOME_SCENE.fleets.length);

    // the last glass blob's window open; the first glass blob (listed first) taken out by its row's button
    maker.chosen.set({ type: 'blob', index: 5 });
    fixture.detectChanges();
    const first = maker.scene().blobs[1]!;
    const last = maker.scene().blobs[5]!;
    row('Glass blob').querySelector<HTMLButtonElement>('.take-out')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(maker.scene().blobs.length).toBe(HOME_SCENE.blobs.length - 1);
    expect(maker.scene().blobs).not.toContain(first);
    expect(maker.chosen()).toEqual({ type: 'blob', index: 4 });
    expect(maker.scene().blobs[4]).toBe(last);

    // Undo, in the snackbar: back where it was, the window still on its blob
    const undo = [...document.querySelectorAll<HTMLButtonElement>('mat-snack-bar-container button')].find((button) => button.textContent?.includes('Undo'))!;
    undo.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(maker.scene().blobs[1]).toBe(first);
    expect(maker.chosen()).toEqual({ type: 'blob', index: 5 });

    // a fleet's row: its own object out
    await click('Add a fleet');
    const fleets = maker.scene().fleets.length;
    rows().at(-1)!.querySelector<HTMLButtonElement>('.take-out')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(maker.scene().fleets.length).toBe(fleets - 1);
    expect(maker.chosen()).toBeNull();
  });

  it("a click on a leader opens its window: a boid or a blob-boid, its fleet's size apart, the leader's ways", async () => {
    const { page, click, maker } = await open();
    await click('Leader of 380');
    expect(page.querySelector('.window')?.textContent).toContain('The leader and its fleet');
    expect(page.querySelector('.window')?.textContent).toContain('How different their sizes are');
    expect(page.querySelector('.window')?.textContent).toContain('Stay together');
    await click('A blob-boid');
    expect(maker.scene().fleets[0]).toEqual(expect.objectContaining({ kind: 'blob-boid', material: 'glass' }));
    expect(page.querySelector('.window')?.textContent).toContain('Body');
    expect(page.querySelector('.window')?.textContent).toContain('Light');
    expect(page.querySelector('.window lenzi-color-picker')).not.toBeNull();
  });

  it('what the pointer does is said by each leader, for its fleet alone; the scene window no longer says it', async () => {
    // lenzi, 2026-11-17: "This should be configurable for every boid" (the toggle was the scene's, for all)
    const { page, click, maker } = await open();
    const toggle = () => page.querySelector<HTMLElement>('.window mat-button-toggle-group[aria-label="The pointer"]');
    const pressed = () => toggle()?.querySelector('.mat-button-toggle-checked')?.textContent?.trim();
    await click('Home');
    expect(toggle()).toBeNull();
    // the home scene says it once for all (flee): every leader shows it as its own until told otherwise
    await click('Leader of 380');
    expect(pressed()).toBe('Flee');
    await click('Target');
    expect(maker.scene().fleets[0]!.follow).toBe('target');
    expect(maker.scene().fleets.slice(1).map((fleet) => fleet.follow)).toEqual([undefined, undefined]);
    expect(pressed()).toBe('Target');
    const rows = () => [...page.querySelectorAll('mat-action-list .object [matListItemLine]')].map((line) => line.textContent?.trim());
    expect(rows()).toContain('Leader of 380, onto the pointer');
    expect(rows()).toContain('Leader of 42, flees the pointer');
    // another leader: its own
    await click('Leader of 42');
    expect(pressed()).toBe('Flee');
    await click('None');
    expect(maker.scene().fleets.map((fleet) => fleet.follow)).toEqual(['target', 'none', undefined]);
  });

  it("a fleet's pointer: its own, else the scene's (a scene from before), else near", () => {
    expect(followOf({ kind: 'boid', count: 1, follow: 'target' }, { blobs: [], fleets: [], follow: 'flee' })).toBe('target');
    expect(followOf({ kind: 'boid', count: 1 }, { blobs: [], fleets: [], follow: 'flee' })).toBe('flee');
    expect(followOf({ kind: 'boid', count: 1 }, { blobs: [], fleets: [] })).toBe('near');
  });

  it('adds a blob and a fleet, opening their windows, and removes them', async () => {
    const { click, maker } = await open();
    const blobs = maker.scene().blobs.length;
    const fleets = maker.scene().fleets.length;
    await click('Add a blob');
    expect(maker.scene().blobs.length).toBe(blobs + 1);
    expect(maker.chosen()).toEqual({ type: 'blob', index: blobs });
    await click('Remove the blob');
    expect(maker.scene().blobs.length).toBe(blobs);
    await click('Add a fleet');
    expect(maker.scene().fleets.at(-1)).toEqual({ kind: 'boid', count: 120, x: 0.5, y: 0.5 });
    await click('Remove the fleet');
    expect(maker.scene().fleets.length).toBe(fleets);
  });

  it('starts paused, being made: every object a mark to choose and move; playing, no marks (the fleets fly)', async () => {
    const { page, click, maker, fixture } = await open();
    expect(maker.playing()).toBe(false);
    expect(page.querySelectorAll('.stage .mark.blob').length).toBe(HOME_SCENE.blobs.length);
    expect(page.querySelectorAll('.stage .mark.leader').length).toBe(HOME_SCENE.fleets.length);

    // a leader chosen and moved with the keyboard: lit, and put further right
    const leader = page.querySelector<HTMLButtonElement>('.stage .mark.leader')!;
    const before = maker.scene().fleets[0]!.x!;
    leader.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(maker.chosen()).toEqual({ type: 'fleet', index: 0 });
    expect(maker.scene().fleets[0]!.x).toBeCloseTo(before + 0.01, 5);
    expect(page.querySelector('.stage .mark.leader')?.classList).toContain('chosen');

    await click('Play');
    expect(maker.playing()).toBe(true);
    expect(page.querySelector('.stage')).toBeNull();
    await click('Pause');
    expect(maker.playing()).toBe(false);
  });

  it('every object is put somewhere: a blob where the background had it, a leader along the middle', () => {
    const scene = placed({ blobs: [{ material: 'lamp', size: 0.1 }, { material: 'glass', size: 0.1, x: 0.9, y: 0.1 }], fleets: [{ kind: 'boid', count: 5 }] });
    expect(scene.blobs[0]).toEqual({ material: 'lamp', size: 0.1, ...blobHome(0, 1) });
    expect(scene.blobs[1]).toEqual({ material: 'glass', size: 0.1, x: 0.9, y: 0.1 });
    expect(scene.fleets[0]).toEqual({ kind: 'boid', count: 5, x: 0.5, y: 0.5 });
  });

  it('a level for each object: its own, or its material’s (glass above), boids on 0', async () => {
    expect(layerOf({ material: 'glass' }, 'blob')).toBe(1);
    expect(layerOf({ material: 'lamp' }, 'blob')).toBe(0);
    expect(layerOf({}, 'boid')).toBe(0);
    expect(layerOf({ material: 'glass', layer: 3 }, 'blob-boid')).toBe(3);
    const { page, click, maker, fixture } = await open();
    await click('Glass blob');
    const level = [...page.querySelectorAll<HTMLButtonElement>('.window [aria-label="Level"] button')].find((button) => button.textContent?.trim() === '2')!;
    level.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(maker.scene().blobs[1]!.layer).toBe(2);
  });

  it('a body and its light: solid or glass, emitting or not ("solid/glass and emitting/not emitting")', () => {
    expect([bodyOf('lamp'), bodyOf('solid'), bodyOf('glass')]).toEqual(['solid', 'solid', 'glass']);
    expect([emitsOf({ material: 'lamp' }), emitsOf({ material: 'solid' }), emitsOf({ material: 'glass' }), emitsOf({ material: 'glass', emitting: true })]).toEqual([true, false, false, true]);
    expect(lookFor('solid', true)).toEqual({ material: 'lamp' });
    expect(lookFor('solid', false)).toEqual({ material: 'solid' });
    expect(lookFor('glass', true)).toEqual({ material: 'glass', emitting: true });
    expect(lookFor('glass', false)).toEqual({ material: 'glass' });
  });

  it('a colour follows its selector while it moves, before it closes (lenzi, 2026-11-21: "tanti input non si aggiornano automaticamente")', async () => {
    const { page, click, maker, fixture } = await open();
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const key = async (element: Element, name: string) => {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: name, keyCode: name === 'Escape' ? 27 : 0, shiftKey: true, bubbles: true }));
      await settle();
    };
    const selector = () => document.querySelector('[role="dialog"]');
    const swatch = (index: number) => page.querySelectorAll<HTMLButtonElement>('.window lenzi-color-picker button.swatch')[index]!;
    /** Opens a swatch of the window and makes the selector's shade brighter (a grey moves too): the colour it shows, the selector still open. */
    const move = async (index: number) => {
      const shown = () => swatch(index).getAttribute('aria-label')!.split(': ').at(-1);
      const before = shown();
      swatch(index).click();
      await settle();
      await key(selector()!.querySelector('.area')!, 'ArrowUp');
      expect(selector()).not.toBeNull();
      expect(shown()).not.toBe(before);
      return shown();
    };
    await click('Glass blob');
    const moved = await move(0);
    expect(maker.scene().blobs[1]!.colour).toBe(moved);
    await key(selector()!, 'Escape');

    // many colours: each of them the same
    const press = [...page.querySelectorAll<HTMLButtonElement>('.window [aria-label="Colour"] button')].find((b) => b.textContent?.trim() === 'Many, shifting')!;
    press.click();
    await settle();
    const second = maker.scene().blobs[1]!.colours![1];
    const first = await move(0);
    expect(maker.scene().blobs[1]!.colours).toEqual([first, second]);
  });

  it("a blob's window: body and light, its colour (one, or many shifting), glass's tint, staying put, its weight", async () => {
    const { page, click, maker, fixture } = await open();
    const press = async (label: string, value: string) => {
      const button = [...page.querySelectorAll<HTMLButtonElement>(`.window [aria-label="${label}"] button`)].find((b) => b.textContent?.trim() === value)!;
      button.click();
      fixture.detectChanges();
      await fixture.whenStable();
    };
    await click('Glass blob');
    await press('Light', 'Emitting');
    expect(maker.scene().blobs[1]).toEqual(expect.objectContaining({ material: 'glass', emitting: true }));
    await press('Body', 'Solid');
    expect(maker.scene().blobs[1]!.material).toBe('lamp');
    expect('emitting' in maker.scene().blobs[1]!).toBe(false);
    await press('Light', 'Not emitting');
    expect(maker.scene().blobs[1]!.material).toBe('solid');

    await press('Colour', 'Many, shifting');
    expect(maker.scene().blobs[1]!.colours?.length).toBe(2);
    expect(page.querySelectorAll('.window lenzi-color-picker').length).toBe(2);
    await click('Add a colour');
    expect(maker.scene().blobs[1]!.colours?.length).toBe(3);
    await press('Colour', 'One colour');
    expect(maker.scene().blobs[1]!.colours).toBeUndefined();
    expect(maker.scene().blobs[1]!.colour).toBe('#d5baff');

    const flip = async (label: string) => {
      const toggle = [...page.querySelectorAll<HTMLElement>('.window mat-slide-toggle')].find((found) => found.textContent?.includes(label))!;
      toggle.querySelector<HTMLButtonElement>('button')!.click();
      fixture.detectChanges();
      await fixture.whenStable();
    };
    await flip('It stays put');
    expect(maker.scene().blobs[1]!.fixed).toBe(true);
    expect(page.querySelector('.window')?.textContent).toContain('Weight');

    // an obstacle: the blobs of another material on its level bounce off it
    expect(maker.scene().blobs[1]!.obstacle).toBeUndefined();
    await flip('An obstacle');
    expect(maker.scene().blobs[1]!.obstacle).toBe(true);
    await flip('An obstacle');
    expect(maker.scene().blobs[1]!.obstacle).toBe(false);
  });

  it("the scene's glass is frosted until the toggle makes it liquid, and back (2026-11-19)", async () => {
    const { page, maker, fixture } = await open();
    const liquid = () => [...page.querySelectorAll<HTMLElement>('.objects mat-slide-toggle')].find((toggle) => toggle.textContent?.includes('Liquid glass'));
    expect(liquid()).toBeDefined();
    expect(maker.scene().glass).toBeUndefined();
    liquid()!.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(maker.scene().glass).toBe('liquid');
    liquid()!.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect('glass' in maker.scene()).toBe(false);
  });

  it("a glass blob has its own blur beside its tint and transparency, its glass kind's until it says one (2026-11-21)", async () => {
    // lenzi, 2026-11-21: "tre proprietà indipendenti per ogni vetro", then "mi piace, vai"
    const { page, maker, fixture } = await open();
    const glass = maker.scene().blobs.findIndex((blob) => blob.material === 'glass');
    maker.chosen.set({ type: 'blob', index: glass });
    fixture.detectChanges();
    await fixture.whenStable();
    const blur = () => page.querySelector<HTMLInputElement>('.window input[aria-label="Blur"]')!;
    const shownBlur = () => blur().closest('.number')?.querySelector('.value')?.textContent?.trim();
    // frosted: the page glass's blur; liquid: sharp
    expect(shownBlur()).toBe('24');
    (maker as unknown as { setLiquid(on: boolean): void }).setLiquid(true);
    fixture.detectChanges();
    expect(shownBlur()).toBe('0');
    blur().value = '6';
    blur().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(maker.scene().blobs[glass]!.blur).toBe(6);
    expect(shownBlur()).toBe('6');
  });

  it('says that black and greys have no hue for the tint to colour with (2026-11-21)', async () => {
    const { page, maker, fixture } = await open();
    const glass = maker.scene().blobs.findIndex((blob) => blob.material === 'glass');
    const paint = async (colour: string) => {
      maker.scene.update((scene) => ({ ...scene, blobs: scene.blobs.map((blob, i) => (i === glass ? { ...blob, colour } : blob)) }));
      maker.chosen.set({ type: 'blob', index: glass });
      fixture.detectChanges();
      await fixture.whenStable();
      return page.querySelector('.window')!.textContent!.includes('Black and greys have no hue');
    };
    expect(await paint('#000000')).toBe(true);
    expect(await paint('#6b6b6b')).toBe(true);
    // a grey a little blue has a hue, however faint: the tint colours it
    expect(await paint('#6b6b72')).toBe(false);
    expect(await paint('#3a3ad8')).toBe(false);
  });

  it('a slider changes the scene while it is dragged, not only once it is let go (2026-11-21, a video of the sliders)', async () => {
    const { page, maker, fixture } = await open();
    const glass = maker.scene().blobs.findIndex((blob) => blob.material === 'glass');
    maker.chosen.set({ type: 'blob', index: glass });
    fixture.detectChanges();
    await fixture.whenStable();
    const tint = page.querySelector<HTMLInputElement>('.window input[aria-label="Tint"]')!;
    // the thumb's own input moves while it is dragged: its "input" events, no "change" yet
    tint.value = '0.35';
    tint.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(maker.scene().blobs[glass]!.tint).toBe(0.35);
    expect(tint.closest('.number')?.querySelector('.value')?.textContent?.trim()).toBe('0.35');
  });

  it("the liquid glass's settings open in a window of their own, beside its toggle; the scene keeps only what differs (2026-11-20)", async () => {
    // lenzi, 2026-11-20: "metti una sezione per il liquidglass nella sezione interna ... per regolare le varie proprietá"
    const { page, maker, fixture } = await open();
    const settings = page.querySelector<HTMLButtonElement>('.objects .toggle-row button[aria-label="Liquid glass settings"]');
    expect(settings).not.toBeNull();
    settings!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const window = () => page.querySelector<HTMLElement>('.window')!;
    expect(maker.chosen()).toEqual({ type: 'liquid' });
    expect(window().querySelector('.window-title')?.textContent?.trim()).toBe('Liquid glass');
    // frosted: only its toggle, no settings
    expect(window().querySelectorAll('mat-slider').length).toBe(0);
    window().querySelector<HTMLButtonElement>('mat-slide-toggle button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(maker.scene().glass).toBe('liquid');
    // liquid: its profile and its six numbers, at the kit's values
    expect(window().querySelectorAll('mat-button-toggle').length).toBe(3);
    expect([...window().querySelectorAll('mat-slider input')].map((input) => input.getAttribute('aria-label'))).toEqual([
      'Bezel width: how far in from the edge it bends (px)',
      'Thickness: the thicker, the more it bends (px)',
      'Refractive index (air is 1)',
      'Refraction: how much of the bending shows',
      'Saturation of what is behind it (1: as it is)',
    ]);
    expect(window().querySelector('.value')?.textContent?.trim()).toBe('33');

    const setter = maker as unknown as { setLiquidNumber(key: string, value: number): void; setLiquidSurface(surface: string): void };
    setter.setLiquidNumber('bezel', 20);
    setter.setLiquidNumber('saturation', 99);
    setter.setLiquidSurface('lip');
    fixture.detectChanges();
    expect(maker.scene().liquid).toEqual({ bezel: 20, saturation: 3, surface: 'lip' });
    // back to the kit's value: not kept
    setter.setLiquidNumber('bezel', 33);
    expect(maker.scene().liquid).toEqual({ saturation: 3, surface: 'lip' });
    // frosted and liquid again: its settings are still there
    maker.chosen.set({ type: 'liquid' });
    fixture.detectChanges();
    window().querySelector<HTMLButtonElement>('mat-slide-toggle button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(maker.scene().glass).toBeUndefined();
    expect(maker.scene().liquid).toEqual({ saturation: 3, surface: 'lip' });
    window().querySelector<HTMLButtonElement>('mat-slide-toggle button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    // back to the default: the scene says nothing of it
    [...window().querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes('Back to the default'))!.click();
    fixture.detectChanges();
    expect('liquid' in maker.scene()).toBe(false);
    // the window has nothing to take out of the scene
    expect([...window().querySelectorAll('button')].some((button) => button.textContent?.includes('Remove'))).toBe(false);
  });

  it('throwing is always at hand in the main panel, whatever window is open; the scene row says whether it throws', async () => {
    // 2026-11-17: "after toggling it stays put i can't interact with any object during play" (the scene threw nothing),
    // then "fai in modo che sia sempre configurabile, dal pannello generale"
    const { page, click, maker, fixture } = await open();
    const sceneRow = () => page.querySelector('mat-action-list .object [matListItemLine]')?.textContent?.trim();
    const throwing = () => [...page.querySelectorAll<HTMLElement>('.objects mat-slide-toggle')].find((toggle) => toggle.textContent?.includes('The pointer throws the blobs'));
    expect(sceneRow()).toBe('The pointer throws the blobs');
    expect(throwing()).toBeDefined();
    // at the panel's foot, after the buttons that add (lenzi's arrow)
    expect(throwing()!.previousElementSibling?.textContent).toContain('Add a current');
    // under it only the scene's glass (2026-11-19)
    expect(throwing()!.nextElementSibling?.textContent).toContain('Liquid glass');
    expect(throwing()!.nextElementSibling!.nextElementSibling).toBeNull();
    await click('Glass blob');
    expect(throwing()).toBeDefined();
    // only there: not again in a window
    expect(page.querySelector('.window')?.textContent).not.toContain('The pointer throws the blobs');

    throwing()!.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(maker.scene().throwable).toBe(false);
    expect(sceneRow()).toBe('The pointer throws nothing');
    throwing()!.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(maker.scene().throwable).toBe(true);
    expect(sceneRow()).toBe('The pointer throws the blobs');
  });

  it('adds a current: listed, drawn with its points while paused, bent, each segment its push, turned round, removed', async () => {
    const { page, click, maker, fixture } = await open();
    await click('Add a current');
    const current = () => maker.scene().currents![0]!;
    expect(current().points.length).toBe(3);
    expect(maker.chosen()).toEqual({ type: 'current', index: 0 });
    expect(page.querySelectorAll('.stage .mark.point').length).toBe(3);
    expect(page.querySelectorAll('.outlines line.current').length).toBe(2);
    expect([...page.querySelectorAll('mat-action-list [matListItemTitle]')].map((t) => t.textContent?.trim()).at(-1)).toBe('Current');

    // a point moved with the keyboard
    const point = page.querySelector<HTMLButtonElement>('.stage .mark.point')!;
    point.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(current().points[0]!.y).toBeCloseTo(0.56, 5);

    await click('Add a point');
    expect(current().points.length).toBe(4);
    expect(current().strengths?.length).toBe(3);
    const first = { ...current().points[0]! };
    await click('Turn it the other way');
    expect(current().points.at(-1)).toEqual(first);
    await click('Take the last point out');
    expect(current().points.length).toBe(3);
    await click('Remove the current');
    expect(maker.scene().currents).toEqual([]);
  });

  it('Random scene: another scene by chance in place of this one, listed; Undo brings this one back', async () => {
    const { page, click, maker, fixture } = await open();
    const mine = maker.scene();
    maker.chosen.set({ type: 'blob', index: 0 });
    await click('Random scene');
    const made = maker.scene();
    expect(made).not.toBe(mine);
    expect(made.blobs.length).toBeGreaterThanOrEqual(3);
    expect(made.fleets[0]!.kind).toBe('boid');
    expect(maker.chosen()).toBeNull();
    const titles = [...page.querySelectorAll('mat-action-list [matListItemTitle]')].map((title) => title.textContent?.trim());
    expect(titles[0]).toBe(made.name);
    expect(titles.length).toBe(1 + made.blobs.length + made.fleets.length + (made.currents?.length ?? 0));

    const undo = [...document.querySelectorAll<HTMLButtonElement>('mat-snack-bar-container button')].find((button) => button.textContent?.includes('Undo'))!;
    undo.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(maker.scene()).toBe(mine);
  });

  it('a blob keeps the shape chosen for it, or (Changing) changes again', async () => {
    const { page, click, maker, fixture } = await open();
    await click('Glass blob');
    const chip = (label: string) => [...page.querySelectorAll<HTMLElement>('.window mat-chip-option')].find((option) => option.textContent?.includes(label))!;
    expect(page.querySelectorAll('.window mat-chip-option svg path').length).toBeGreaterThan(10);
    chip('Burst').querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(maker.scene().blobs[1]!.shape).toBe('burst');
    chip('Changing').querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect('shape' in maker.scene().blobs[1]!).toBe(false);
  });

  it("a fleet that does not say shows its kind's numbers: blob-boids a little slower", () => {
    expect(fleetDefault({ kind: 'boid', count: 10 }, 'maxSpeed')).toBe(150);
    expect(fleetDefault({ kind: 'blob-boid', count: 10 }, 'maxSpeed')).toBeCloseTo(105);
    expect(fleetDefault({ kind: 'blob-boid', count: 10 }, 'size')).toBe(11);
  });
});

describe('SceneMakerPage, the admin keeping scenes', () => {
  const saves = (page: HTMLElement) =>
    [...page.querySelectorAll<HTMLButtonElement>('button.save, button.save-new')].map((button) => button.textContent?.replace(/\s+/g, ' ').trim());
  const said = () => [...document.querySelectorAll('mat-snack-bar-container')].at(-1)?.textContent ?? '';
  const press = async (fixture: { detectChanges(): void; whenStable(): Promise<unknown> }, page: HTMLElement, selector: string) => {
    page.querySelector<HTMLButtonElement>(selector)!.click();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('a visitor has no Save: the scene is shared by its link', async () => {
    const { page, scenes } = await open();
    expect(saves(page)).toEqual([]);
    expect(scenes.list).not.toHaveBeenCalled();
  });

  it('Save keeps the scene as a new one, then saves that one again; Save as a new scene keeps another', async () => {
    const { page, click, maker, scenes, fixture } = await open({ admin: true });
    expect(saves(page)).toEqual(['save Save']);

    await press(fixture, page, 'button.save');
    expect(scenes.add).toHaveBeenCalledTimes(1);
    const kept = scenes.add.mock.calls[0]![0];
    expect(kept.name).toBe('Home');
    expect(kept.blobs.length).toBe(HOME_SCENE.blobs.length);
    // every object where the maker shows it
    expect(kept.blobs.every((blob) => typeof blob.x === 'number' && typeof blob.y === 'number')).toBe(true);
    expect(maker.savedId()).toBe('new00001');
    expect(said()).toContain('Kept in your scenes');

    // now it is that scene: Save saves it again, and another button keeps a new one
    expect(saves(page)).toEqual(['save Save', 'library_add Save as a new scene']);
    await click('Random scene');
    await press(fixture, page, 'button.save');
    expect(scenes.update).toHaveBeenCalledTimes(1);
    expect(scenes.update.mock.calls[0]![0]).toBe('new00001');
    expect(scenes.update.mock.calls[0]![1]).toEqual(maker.scene());
    expect(scenes.add).toHaveBeenCalledTimes(1);

    await press(fixture, page, 'button.save-new');
    expect(scenes.add).toHaveBeenCalledTimes(2);
  });

  it('the snackbar of a save leads to the gallery', async () => {
    const { page, fixture } = await open({ admin: true });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    await press(fixture, page, 'button.save');
    [...document.querySelectorAll<HTMLButtonElement>('mat-snack-bar-container button')].find((button) => button.textContent?.includes('See them'))!.click();
    expect(navigate).toHaveBeenCalledWith(['/scenes']);
  });

  it('a kept scene taken out meanwhile: said, and the next Save keeps it as a new one', async () => {
    const scenes = gallery();
    scenes.update.mockReturnValue(throwError(() => ({ status: 404, title: 'No such scene' })));
    const { page, maker, fixture } = await open({ admin: true, scenes });
    maker.savedId.set('gone0000');
    fixture.detectChanges();
    await press(fixture, page, 'button.save');
    expect(scenes.update).toHaveBeenCalledWith('gone0000', expect.anything());
    expect(maker.savedId()).toBeNull();
    expect(said()).toContain('not in the gallery any more');
    await press(fixture, page, 'button.save');
    expect(scenes.add).toHaveBeenCalledTimes(1);
  });

  it('a failed save says why, and Save can be pressed again', async () => {
    const scenes = gallery();
    scenes.add.mockReturnValue(throwError(() => ({ status: 409, detail: 'It keeps 200 scenes at most: take one out first.' })));
    const { page, fixture } = await open({ admin: true, scenes });
    await press(fixture, page, 'button.save');
    expect(said()).toContain('Could not save the scene: It keeps 200 scenes at most: take one out first. (409)');
    expect(page.querySelector<HTMLButtonElement>('button.save')!.disabled).toBe(false);
  });
});

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LenziScene, blobHome } from '@lenzi/ui-kit/backgrounds';

import { HOME_SCENE } from '../../scenes';
import { KitServer } from '../../shared/kit-server';
import { SavedScene, SavedScenes } from '../../shared/saved-scenes';
import { SceneMakerPage, bodyOf, emitsOf, fleetDefault, layerOf, lookFor, placed } from './scene-maker-page';

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

  it('a scene that throws no blob says so: on its row, and in a blob window, with a button that turns throwing on', async () => {
    // 2026-11-17, "after toggling it stays put i can't interact with any object during play": the scene threw nothing
    const { page, click, maker, fixture } = await open();
    const sceneRow = () => page.querySelector('mat-action-list .object [matListItemLine]')?.textContent?.trim();
    expect(sceneRow()).toBe('The pointer: flee, throwing');
    await click('Glass blob');
    expect(page.querySelector('.window .throw-off')).toBeNull();

    maker.scene.update((scene) => ({ ...scene, throwable: false }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(sceneRow()).toBe('The pointer: flee, not throwing');
    expect(page.querySelector('.window .throw-off')?.textContent).toContain('throws no blob');
    await click('Turn throwing on');
    expect(maker.scene().throwable).toBe(true);
    expect(page.querySelector('.window .throw-off')).toBeNull();
    expect(sceneRow()).toBe('The pointer: flee, throwing');
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

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { blobHome } from '@lenzi/ui-kit/backgrounds';

import { HOME_SCENE } from '../../scenes';
import { SceneMakerPage, fleetDefault, layerOf, placed } from './scene-maker-page';

async function open() {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
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
  return { fixture, page, click, maker: fixture.componentInstance };
}

describe('SceneMakerPage', () => {
  it("lists the scene's objects on the left, each with its icon: the scene, its blobs, its fleets' leaders", async () => {
    const { page } = await open();
    const titles = [...page.querySelectorAll('mat-action-list [matListItemTitle]')].map((title) => title.textContent?.trim());
    expect(titles[0]).toBe('Home');
    expect(titles.filter((title) => title?.endsWith('blob')).length).toBe(HOME_SCENE.blobs.length);
    expect(titles.filter((title) => title === 'Boids' || title?.endsWith('blob-boids')).length).toBe(HOME_SCENE.fleets.length);
    expect(page.querySelectorAll('mat-action-list mat-icon').length).toBe(titles.length);
    expect(page.querySelector('lenzi-scene')).not.toBeNull();
  });

  it("a click on a leader opens its window: a boid or a blob-boid, its fleet's size apart, the leader's ways", async () => {
    const { page, click, maker } = await open();
    await click('Leader of 380');
    expect(page.querySelector('.window')?.textContent).toContain('The leader and its fleet');
    expect(page.querySelector('.window')?.textContent).toContain('How different their sizes are');
    expect(page.querySelector('.window')?.textContent).toContain('Stay together');
    await click('A blob-boid');
    expect(maker.scene().fleets[0]).toEqual(expect.objectContaining({ kind: 'blob-boid', material: 'glass' }));
    expect(page.querySelector('.window')?.textContent).toContain('Made of');
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

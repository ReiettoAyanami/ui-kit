import { STRONGEST_CURRENT } from '@lenzi/ui-kit/backgrounds';

import { HOME_SCENE } from '../scenes';
import { SCENE_LIMITS, cleanScene, sceneFromCode, sceneToCode } from './scene-code';

describe('a scene in a link', () => {
  it('goes into a code that fits a URL and comes back the same', async () => {
    const code = await sceneToCode(HOME_SCENE);
    expect(code).toMatch(/^[zj][A-Za-z0-9_-]+$/);
    expect(await sceneFromCode(code)).toEqual(HOME_SCENE);
  });

  it("keeps the scene's liquid glass, and nothing else as its glass (2026-11-19)", async () => {
    const liquid = { ...HOME_SCENE, glass: 'liquid' as const };
    expect((await sceneFromCode(await sceneToCode(liquid)))?.glass).toBe('liquid');
    expect(cleanScene({ blobs: [], fleets: [], glass: 'frosted' })?.glass).toBeUndefined();
    expect(cleanScene({ blobs: [], fleets: [], glass: 'molten' })?.glass).toBeUndefined();
  });

  it("keeps its liquid glass's settings, within bounds, only with liquid glass (2026-11-20)", async () => {
    const tuned = { ...HOME_SCENE, glass: 'liquid' as const, liquid: { bezel: 20, surface: 'lip' as const, saturation: 1 } };
    expect((await sceneFromCode(await sceneToCode(tuned)))?.liquid).toEqual({ bezel: 20, surface: 'lip', saturation: 1 });
    expect(cleanScene({ blobs: [], fleets: [], glass: 'liquid', liquid: { bezel: -3, thickness: 'thick', what: 1 } })?.liquid).toEqual({ bezel: 4 });
    expect(cleanScene({ blobs: [], fleets: [], liquid: { bezel: 20 } })?.liquid).toBeUndefined();
    expect(cleanScene({ blobs: [], fleets: [], glass: 'liquid', liquid: {} })?.liquid).toBeUndefined();
  });

  it("keeps a glass blob's and a glass fleet's own blur, within sharp and the page glass's; nobody else's (2026-11-21)", () => {
    const scene = cleanScene({
      blobs: [
        { material: 'glass', size: 0.1, blur: 6 },
        { material: 'glass', size: 0.1, blur: 99 },
        { material: 'solid', size: 0.1, blur: 6 },
      ],
      fleets: [{ kind: 'blob-boid', material: 'glass', count: 4, blur: 3 }],
    })!;
    expect(scene.blobs.map((blob) => blob.blur)).toEqual([6, 24, undefined]);
    expect(scene.fleets[0]!.blur).toBe(3);
  });

  it('a code that is not a scene is none', async () => {
    for (const code of [null, '', 'x123', 'z!!!', 'zAAAA', `j${btoa('{"blobs": 3}')}`]) expect(await sceneFromCode(code)).toBeNull();
  });

  it('keeps what a link brings within bounds, and leaves out what is not a scene', () => {
    const scene = cleanScene({
      name: '  Mine  ',
      blobs: [{ material: 'lamp', size: 9 }, { material: 'gold', size: 0.1 }, ...Array.from({ length: 30 }, () => ({ material: 'glass', size: 0.1 }))],
      fleets: [
        { kind: 'boid', count: 1e9, maxSpeed: -5, colonies: 2.6, script: 'alert(1)', follow: 'chase' },
        { kind: 'dragon', count: 3 },
        { kind: 'blob-boid', count: 10, material: 'gold' },
      ],
      follow: 'chase',
      throwable: 'yes',
    })!;
    expect(cleanScene({ blobs: [{ material: 'lamp', size: 0.1, shape: 'burst', x: 2, y: -1, layer: 9 }, { material: 'lamp', size: 0.1, shape: 'teapot', x: 0.5 }], fleets: [] })!.blobs).toEqual([
      { material: 'lamp', size: 0.1, shape: 'burst', x: 1, y: 0, layer: 3 },
      { material: 'lamp', size: 0.1 },
    ]);
    expect(
      cleanScene({
        blobs: [
          { material: 'glass', size: 0.1, colour: '#AABBCC', tint: 3, emitting: true, fixed: true, weight: 99, obstacle: true },
          { material: 'solid', size: 0.1, colour: 'red', emitting: true, fixed: 'yes', weight: 'heavy', obstacle: 'yes' },
        ],
        fleets: [{ kind: 'blob-boid', material: 'glass', count: 4, colour: '#112233', tint: 0.4, emitting: true, follow: 'target' }],
      }),
    ).toEqual({
      blobs: [
        { material: 'glass', size: 0.1, colour: '#aabbcc', tint: 1, emitting: true, fixed: true, weight: 4, obstacle: true },
        { material: 'solid', size: 0.1 },
      ],
      // each fleet's own pointer (2026-11-17: "configurable for every boid")
      fleets: [{ kind: 'blob-boid', material: 'glass', count: 4, colour: '#112233', tint: 0.4, emitting: true, follow: 'target' }],
    });
    expect(
      cleanScene({
        blobs: [],
        fleets: [],
        currents: [
          { points: [{ x: -1, y: 0.5 }, { x: 0.5, y: 2 }, { x: 'far' }], strengths: [9000, 50, 70], width: 3 },
          { points: [{ x: 0.1, y: 0.1 }] },
          'river',
        ],
      })!.currents,
    ).toEqual([{ points: [{ x: 0, y: 0.5 }, { x: 0.5, y: 1 }], strengths: [STRONGEST_CURRENT], width: 0.4 }]);
    expect(scene.name).toBe('Mine');
    expect(scene.blobs.length).toBe(SCENE_LIMITS.blobs);
    expect(scene.blobs[0]).toEqual({ material: 'lamp', size: 0.5 });
    expect(scene.fleets).toEqual([
      { kind: 'boid', count: SCENE_LIMITS.perFleet, maxSpeed: 10, colonies: 3 },
      { kind: 'blob-boid', count: 10 },
    ]);
    expect(scene.follow).toBeUndefined();
    expect(scene.throwable).toBeUndefined();
  });
});

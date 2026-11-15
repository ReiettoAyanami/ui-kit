import { HOME_SCENE } from '../scenes';
import { SCENE_LIMITS, cleanScene, sceneFromCode, sceneToCode } from './scene-code';

describe('a scene in a link', () => {
  it('goes into a code that fits a URL and comes back the same', async () => {
    const code = await sceneToCode(HOME_SCENE);
    expect(code).toMatch(/^[zj][A-Za-z0-9_-]+$/);
    expect(await sceneFromCode(code)).toEqual(HOME_SCENE);
  });

  it('a code that is not a scene is none', async () => {
    for (const code of [null, '', 'x123', 'z!!!', 'zAAAA', `j${btoa('{"blobs": 3}')}`]) expect(await sceneFromCode(code)).toBeNull();
  });

  it('keeps what a link brings within bounds, and leaves out what is not a scene', () => {
    const scene = cleanScene({
      name: '  Mine  ',
      blobs: [{ material: 'lamp', size: 9 }, { material: 'gold', size: 0.1 }, ...Array.from({ length: 30 }, () => ({ material: 'glass', size: 0.1 }))],
      fleets: [
        { kind: 'boid', count: 1e9, maxSpeed: -5, colonies: 2.6, script: 'alert(1)' },
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
        fleets: [{ kind: 'blob-boid', material: 'glass', count: 4, colour: '#112233', tint: 0.4, emitting: true }],
      }),
    ).toEqual({
      blobs: [
        { material: 'glass', size: 0.1, colour: '#aabbcc', tint: 1, emitting: true, fixed: true, weight: 4, obstacle: true },
        { material: 'solid', size: 0.1 },
      ],
      fleets: [{ kind: 'blob-boid', material: 'glass', count: 4, colour: '#112233', tint: 0.4, emitting: true }],
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
    ).toEqual([{ points: [{ x: 0, y: 0.5 }, { x: 0.5, y: 1 }], strengths: [600], width: 0.4 }]);
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

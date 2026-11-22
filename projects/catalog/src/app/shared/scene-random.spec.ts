import { cleanScene, SCENE_LIMITS } from './scene-code';
import { randomScene } from './scene-random';

/** Chance that repeats: the same numbers for the same seed (mulberry32). */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('a random scene', () => {
  it('is a scene a link keeps as it is: every one within bounds, with blobs, a fleet of boids, something that shines', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const scene = randomScene(seeded(seed));
      expect(cleanScene(scene)).toEqual(scene);
      // many things (2026-11-21: "aggiungi più entità nelle scene randomiche"): six to twelve blobs, two to five fleets
      expect(scene.blobs.length).toBeGreaterThanOrEqual(6);
      expect(scene.blobs.length).toBeLessThanOrEqual(12);
      expect(scene.blobs.some((blob) => blob.material === 'lamp' || blob.emitting)).toBe(true);
      expect(scene.blobs.every((blob) => typeof blob.x === 'number' && typeof blob.y === 'number')).toBe(true);
      expect(scene.fleets[0]!.kind).toBe('boid');
      expect(scene.fleets.length).toBeGreaterThanOrEqual(2);
      expect(scene.fleets.length).toBeLessThanOrEqual(5);
      expect(scene.fleets.every((fleet) => fleet.count > 0 && fleet.count <= 400 && typeof fleet.x === 'number')).toBe(true);
      expect(scene.currents?.length ?? 0).toBeLessThanOrEqual(Math.min(2, SCENE_LIMITS.currents));
      expect(scene.name).toMatch(/^\w+ \w+$/);
      // two levels at most, the materials' own: each one more is the picture's work again
      expect([...scene.blobs, ...scene.fleets].every((thing) => (thing.layer ?? 0) <= 1)).toBe(true);
    }
  });

  it('the same chance gives the same scene; another, another', () => {
    expect(randomScene(seeded(7))).toEqual(randomScene(seeded(7)));
    expect(randomScene(seeded(7))).not.toEqual(randomScene(seeded(8)));
  });

  it('over many, every look, kind and extra turns up', () => {
    const scenes = Array.from({ length: 200 }, (_, index) => randomScene(seeded(1000 + index)));
    const blobs = scenes.flatMap((scene) => scene.blobs);
    for (const material of ['lamp', 'glass', 'solid']) expect(blobs.some((blob) => blob.material === material)).toBe(true);
    expect(blobs.some((blob) => blob.emitting)).toBe(true);
    expect(blobs.some((blob) => blob.shape)).toBe(true);
    expect(blobs.some((blob) => blob.colours)).toBe(true);
    expect(blobs.some((blob) => blob.layer !== undefined)).toBe(true);
    expect(scenes.some((scene) => scene.fleets.some((fleet) => fleet.kind === 'blob-boid'))).toBe(true);
    expect(scenes.some((scene) => scene.currents?.length)).toBe(true);
    expect(scenes.some((scene) => scene.currents?.length === 2)).toBe(true);
    expect(scenes.some((scene) => !scene.currents)).toBe(true);
    // the glass's own blur, and liquid glass, now and then (2026-11-21)
    expect(blobs.some((blob) => typeof blob.blur === 'number')).toBe(true);
    expect(scenes.some((scene) => scene.glass === 'liquid')).toBe(true);
    expect(scenes.some((scene) => !scene.glass)).toBe(true);
  });
});

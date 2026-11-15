import { BlobState } from './blob-field';
import { BlobThrow } from './blob-throw';
import { BLOB_SHAPES } from './shapes';

const blob = (x: number, y: number, radius = 50): BlobState => ({ x, y, radius, rotation: 0, from: BLOB_SHAPES.circle, to: BLOB_SHAPES.circle, mix: 0 });

describe('throwing blobs', () => {
  it('takes only a blob under the pointer', () => {
    const throws = new BlobThrow();
    const paths = [blob(100, 100), blob(400, 100)];
    expect(throws.grab(paths, 250, 100, 0)).toBe(false);
    expect(throws.grab(paths, 410, 90, 0)).toBe(true);
    expect(throws.holding).toBe(true);
  });

  it('a held blob follows the pointer, from where it was taken', () => {
    const throws = new BlobThrow();
    const paths = [blob(100, 100)];
    throws.grab(paths, 110, 100, 0);
    throws.drag(310, 200, 0.05);
    throws.step(1 / 60, paths, 1000, 1000);
    const [held] = throws.apply(paths);
    expect([held!.x, held!.y]).toEqual([300, 200]);
  });

  it('let go while moving, it flies on and slows down; then it drifts back to its path', () => {
    const throws = new BlobThrow();
    const paths = [blob(200, 500)];
    throws.grab(paths, 200, 500, 0);
    throws.drag(240, 500, 0.05);
    throws.drag(280, 500, 0.1);
    throws.release(0.1);
    let last = throws.apply(paths)[0]!.x;
    throws.step(1 / 60, paths, 4000, 1000);
    const moved = throws.apply(paths)[0]!.x - last;
    // about 800 px/s: 13 px in a sixtieth of a second
    expect(moved).toBeGreaterThan(8);
    for (let i = 0; i < 60; i++) throws.step(1 / 60, paths, 4000, 1000);
    last = throws.apply(paths)[0]!.x;
    expect(last).toBeGreaterThan(400);
    // a long time later it is back on its path
    for (let i = 0; i < 60 * 40; i++) throws.step(1 / 60, paths, 4000, 1000);
    expect(Math.abs(throws.apply(paths)[0]!.x - 200)).toBeLessThan(20);
  });

  it('bounces off an edge instead of leaving the space', () => {
    const throws = new BlobThrow();
    const paths = [blob(900, 500)];
    throws.grab(paths, 900, 500, 0);
    throws.drag(950, 500, 0.05);
    throws.drag(1000, 500, 0.1);
    throws.release(0.1);
    for (let i = 0; i < 120; i++) {
      throws.step(1 / 60, paths, 1000, 1000);
      expect(throws.apply(paths)[0]!.x).toBeLessThanOrEqual(1000 - 25);
    }
  });

  it('let go standing still, it stays where it was dropped', () => {
    const throws = new BlobThrow();
    const paths = [blob(200, 200)];
    throws.grab(paths, 200, 200, 0);
    throws.drag(300, 200, 0.05);
    throws.step(1 / 60, paths, 1000, 1000);
    throws.release(0.5);
    throws.step(1 / 60, paths, 1000, 1000);
    expect(throws.apply(paths)[0]!.x).toBeCloseTo(300, 0);
  });

  it('reset: every blob back on its own path, none held, and it goes on from there', () => {
    const throws = new BlobThrow();
    const paths = [blob(200, 200), blob(600, 600)];
    throws.grab(paths, 200, 200, 0);
    throws.drag(400, 300, 0.05);
    throws.step(1 / 60, paths, 1000, 1000);
    expect(throws.apply(paths)[0]!.x).toBeCloseTo(400, 0);
    expect(throws.held).toBe(0);
    throws.reset();
    expect(throws.holding).toBe(false);
    expect(throws.held).toBe(-1);
    expect(throws.apply(paths)).toEqual(paths);
    throws.step(1 / 60, paths, 1000, 1000);
    expect(throws.apply(paths)).toEqual(paths);
  });
  describe('blobs that bounce off one another', () => {
    const all = () => true;
    const even = () => 1;
    const gap = (throws: BlobThrow, paths: BlobState[]) => {
      const [one, other] = throws.apply(paths);
      return Math.hypot(other!.x - one!.x, other!.y - one!.y);
    };

    it('two that overlap are pushed apart until they touch, each by half when they weigh the same', () => {
      const throws = new BlobThrow();
      const paths = [blob(200, 300), blob(260, 300)];
      throws.collide(paths, all, even);
      const [one, other] = throws.apply(paths);
      expect(gap(throws, paths)).toBeCloseTo(100, 5);
      expect(one!.x).toBeCloseTo(180, 5);
      expect(other!.x).toBeCloseTo(280, 5);
      expect([one!.y, other!.y]).toEqual([300, 300]);
    });

    it('the heavier one is pushed less; one made fast (no mass) not at all; the held one neither', () => {
      const heavy = new BlobThrow();
      const paths = [blob(200, 300), blob(260, 300)];
      heavy.collide(paths, all, (index) => (index === 0 ? 3 : 1));
      expect(heavy.apply(paths)[0]!.x).toBeCloseTo(190, 5);
      expect(heavy.apply(paths)[1]!.x).toBeCloseTo(290, 5);

      const fast = new BlobThrow();
      fast.collide(paths, all, (index) => (index === 0 ? 0 : 1));
      expect(fast.apply(paths)[0]).toEqual(paths[0]);
      expect(fast.apply(paths)[1]!.x).toBeCloseTo(300, 5);

      const held = new BlobThrow();
      held.grab(paths, 200, 300, 0);
      held.collide(paths, all, even);
      expect(held.apply(paths)[0]).toEqual(paths[0]);
      expect(held.apply(paths)[1]!.x).toBeCloseTo(300, 5);
    });

    it('only the pairs that are said to; apart, nothing moves', () => {
      const throws = new BlobThrow();
      const paths = [blob(200, 300), blob(260, 300), blob(600, 300)];
      throws.collide(paths, () => false, even);
      expect(throws.apply(paths)).toEqual(paths);
      throws.collide([blob(200, 300), blob(320, 300)], all, even);
      expect(throws.apply(paths)).toEqual(paths);
    });

    it('follows the shapes: a clover turned so its dip faces the other lets it nearer than its lobe would', () => {
      const clover = (rotation: number): BlobState => ({ x: 200, y: 300, radius: 50, rotation, from: BLOB_SHAPES.clover4, to: BLOB_SHAPES.clover4, mix: 0 });
      const distance = (rotation: number) => {
        const throws = new BlobThrow();
        const paths = [clover(rotation), blob(240, 300)];
        throws.collide(paths, all, even);
        return gap(throws, paths);
      };
      const turns = Array.from({ length: 16 }, (_, i) => distance((i / 16) * Math.PI));
      expect(Math.max(...turns)).toBeCloseTo(100, 0);
      expect(Math.min(...turns)).toBeLessThan(95);
    });

    it('a thrown blob bounces off one that stays put, and loses some of its speed', () => {
      const throws = new BlobThrow();
      const paths = [blob(200, 300), blob(500, 300)];
      throws.grab(paths, 200, 300, 0);
      throws.drag(240, 300, 0.05);
      throws.drag(280, 300, 0.1);
      throws.release(0.1);
      let nearest = Infinity;
      let turnedBack = false;
      let last = 200;
      for (let i = 0; i < 240; i++) {
        throws.step(1 / 120, paths, 4000, 1000);
        throws.collide(throws.apply(paths), all, (index) => (index === 1 ? 0 : 1));
        const [one, other] = throws.apply(paths);
        nearest = Math.min(nearest, other!.x - one!.x);
        if (one!.x < last - 0.5) turnedBack = true;
        last = one!.x;
        expect(other).toEqual(paths[1]);
      }
      expect(nearest).toBeGreaterThanOrEqual(100 - 1e-6);
      expect(turnedBack).toBe(true);
    });
  });
});

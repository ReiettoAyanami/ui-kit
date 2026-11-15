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
    throws.reset();
    expect(throws.holding).toBe(false);
    expect(throws.apply(paths)).toEqual(paths);
    throws.step(1 / 60, paths, 1000, 1000);
    expect(throws.apply(paths)).toEqual(paths);
  });
});

import { BlobDrift, DEFAULT_CURRENT, currentsFlow } from './currents';

describe('currents', () => {
  // a space 1000 × 1000: a current left to right along the middle, then down
  const flow = currentsFlow(
    [{ points: [{ x: 0.1, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.9 }], strengths: [100, 300], width: 0.1 }],
    1000,
    1000,
  )!;

  it('pushes along each segment, by its own strength, on its line', () => {
    const [fx, fy] = flow(300, 500);
    expect(fx).toBeCloseTo(100, 5);
    expect(fy).toBeCloseTo(0, 5);
    const [gx, gy] = flow(500, 750);
    expect(gx).toBeCloseTo(0, 5);
    expect(gy).toBeCloseTo(300, 5);
  });

  it('less away from its line, none past its reach', () => {
    expect(flow(300, 540)[0]).toBeGreaterThan(0);
    expect(flow(300, 540)[0]).toBeLessThan(100);
    expect(flow(300, 650)).toEqual([0, 0]);
    expect(flow(900, 100)).toEqual([0, 0]);
  });

  it('no current, no push; a segment without a strength has the last one before it, or the default', () => {
    expect(currentsFlow([], 100, 100)).toBeNull();
    const plain = currentsFlow([{ points: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }] }], 1000, 1000)!;
    expect(plain(500, 500)[0]).toBeCloseTo(DEFAULT_CURRENT.strength, 5);
  });

  it('carries a blob along; one that stays put not at all; reset, every blob back where its path puts it', () => {
    const drift = new BlobDrift();
    const blobs = [{ x: 300, y: 500, radius: 40 }, { x: 300, y: 500, radius: 40 }];
    for (let i = 0; i < 120; i++) drift.step(1 / 60, blobs, flow, (index) => (index === 0 ? 1 : 0));
    const carried = drift.apply(blobs, 1000, 1000);
    expect(carried[0]!.x).toBeGreaterThan(310);
    expect(carried[1]).toEqual(blobs[1]);
    drift.reset();
    expect(drift.apply(blobs, 1000, 1000)).toEqual(blobs);
  });

  it('a blob in the hand is not carried: where the hand is, and from there when let go', () => {
    const drift = new BlobDrift();
    const blobs = [{ x: 300, y: 500, radius: 40 }, { x: 320, y: 500, radius: 40 }];
    for (let i = 0; i < 120; i++) drift.step(1 / 60, blobs, flow, () => 1);
    // the first one taken: every step, as long as it is held
    for (let i = 0; i < 60; i++) {
      drift.step(1 / 60, blobs, flow, () => 1);
      drift.still(0);
    }
    const now = drift.apply(blobs, 1000, 1000);
    expect(now[0]).toEqual(blobs[0]);
    expect(now[1]!.x).toBeGreaterThan(330);
    // let go: carried again, from where it is
    drift.still(-1);
    drift.step(1 / 60, blobs, flow, () => 1);
    const after = drift.apply(blobs, 1000, 1000)[0]!.x;
    expect(after).toBeGreaterThan(300);
    expect(after).toBeLessThan(301);
  });
});

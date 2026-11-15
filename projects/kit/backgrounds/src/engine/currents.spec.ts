import { DEFAULT_CURRENT, currentsFlow } from './currents';

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
});

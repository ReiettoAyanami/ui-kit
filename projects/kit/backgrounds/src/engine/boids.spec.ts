import { Boids, BoidsSettings, MAX_BOIDS } from './boids';

/** A flock with every rule off, so a test turns on the one it is about. */
const QUIET: Partial<BoidsSettings> = { separation: 0, alignment: 0, cohesion: 0, follow: 'none', wander: 0, minSpeed: 0, viewAngle: 360 };

function place(flock: Boids, boids: [number, number, number, number][]): void {
  boids.forEach(([x, y, vx, vy], i) => {
    flock.x[i] = x;
    flock.y[i] = y;
    flock.vx[i] = vx;
    flock.vy[i] = vy;
  });
}

const run = (flock: Boids, seconds: number) => {
  for (let step = 0; step < seconds * 60; step++) flock.step(1 / 60);
};

describe('a flock of boids', () => {
  it('starts inside its space, each boid on its way, the same for the same seed', () => {
    const flock = new Boids({ count: 50 }, 800, 600, 3);
    const again = new Boids({ count: 50 }, 800, 600, 3);
    expect(flock.count).toBe(50);
    expect([...flock.x]).toEqual([...again.x]);
    for (let i = 0; i < flock.count; i++) {
      expect(flock.x[i]).toBeGreaterThanOrEqual(0);
      expect(flock.x[i]).toBeLessThanOrEqual(800);
      expect(Math.hypot(flock.vx[i]!, flock.vy[i]!)).toBeGreaterThan(0);
    }
    expect(new Boids({ count: 1e9 }, 100, 100).count).toBe(MAX_BOIDS);
  });

  it('keeps apart: two boids too close move away from each other', () => {
    const flock = new Boids({ ...QUIET, count: 2, separation: 2, separationDistance: 40 }, 800, 600);
    place(flock, [[400, 300, 0, 0], [410, 300, 0, 0]]);
    run(flock, 0.5);
    expect(flock.x[1]! - flock.x[0]!).toBeGreaterThan(10);
  });

  it('heads the same way: a boid turns to fly as its neighbours do', () => {
    const flock = new Boids({ ...QUIET, count: 3, alignment: 2, perception: 200, edges: 'avoid', edgeMargin: 1 }, 2000, 2000);
    place(flock, [[1000, 1000, 100, 0], [1000, 1040, 0, 100], [1000, 1080, 0, 100]]);
    run(flock, 1);
    // the first was going right; now it goes down too
    expect(flock.vy[0]!).toBeGreaterThan(Math.abs(flock.vx[0]!));
  });

  it('stays together: far boids that see each other come closer', () => {
    const flock = new Boids({ ...QUIET, count: 2, cohesion: 2, perception: 400 }, 2000, 2000);
    place(flock, [[800, 1000, 0, 0], [1100, 1000, 0, 0]]);
    run(flock, 1);
    expect(flock.x[1]! - flock.x[0]!).toBeLessThan(250);
  });

  it('never flies faster than its fastest, nor slower than its slowest', () => {
    const flock = new Boids({ count: 120, maxSpeed: 120, minSpeed: 50 }, 800, 600, 9);
    flock.setTarget({ x: 400, y: 300 });
    run(flock, 2);
    for (let i = 0; i < flock.count; i++) {
      const speed = Math.hypot(flock.vx[i]!, flock.vy[i]!);
      expect(speed).toBeLessThanOrEqual(120.01);
      expect(speed).toBeGreaterThanOrEqual(49.99);
    }
  });

  it('"target": the flock goes onto the target and slows down there', () => {
    const flock = new Boids({ count: 40, follow: 'target', followWeight: 2, followRadius: 120, wander: 0 }, 1000, 800, 5);
    flock.setTarget({ x: 700, y: 200 });
    run(flock, 8);
    let far = 0;
    let speed = 0;
    for (let i = 0; i < flock.count; i++) {
      far += Math.hypot(flock.x[i]! - 700, flock.y[i]! - 200);
      speed += Math.hypot(flock.vx[i]!, flock.vy[i]!);
    }
    expect(far / flock.count).toBeLessThan(120);
    expect(speed / flock.count).toBeLessThan(110);
  });

  it('"near": the flock stays around the target without stopping on it', () => {
    const flock = new Boids({ count: 40, follow: 'near', followWeight: 1.2, followRadius: 150, edges: 'avoid' }, 1600, 1200, 5);
    flock.setTarget({ x: 800, y: 600 });
    run(flock, 10);
    let far = 0;
    let speed = 0;
    for (let i = 0; i < flock.count; i++) {
      far += Math.hypot(flock.x[i]! - 800, flock.y[i]! - 600);
      speed += Math.hypot(flock.vx[i]!, flock.vy[i]!);
    }
    expect(far / flock.count).toBeLessThan(420);
    expect(speed / flock.count).toBeGreaterThanOrEqual(59.9);
  });

  it('at the edges comes back from the other side, or turns away before them', () => {
    const wrapping = new Boids({ ...QUIET, count: 1, edges: 'wrap' }, 200, 200);
    place(wrapping, [[195, 100, 100, 0]]);
    run(wrapping, 0.2);
    expect(wrapping.x[0]!).toBeLessThan(50);

    const turning = new Boids({ ...QUIET, count: 1, edges: 'avoid', edgeMargin: 60, maxSpeed: 100, minSpeed: 100 }, 400, 400);
    place(turning, [[330, 200, 100, 0]]);
    run(turning, 3);
    expect(turning.x[0]!).toBeLessThan(400);
    expect(turning.vx[0]!).toBeLessThan(0);
  });

  it('new settings keep the boids that are there; a new size keeps their place in proportion', () => {
    const flock = new Boids({ count: 10 }, 400, 300, 2);
    const first = flock.x[0]!;
    flock.configure({ count: 20 });
    expect(flock.count).toBe(20);
    expect(flock.x[0]).toBe(first);
    flock.configure({ count: 5 });
    expect(flock.count).toBe(5);
    flock.resize(800, 600);
    expect(flock.x[0]).toBeCloseTo(first * 2);
  });
});

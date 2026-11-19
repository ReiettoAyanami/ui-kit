import { Boids, BoidsSettings, MAX_BOIDS, honeycomb } from './boids';
import { STRONGEST_CURRENT, currentsFlow } from './currents';

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

  it('flies round an obstacle instead of through it', () => {
    const flock = new Boids({ ...QUIET, count: 1, minSpeed: 100, maxSpeed: 120 }, 2000, 600);
    // straight at a round obstacle, a little off its middle
    place(flock, [[100, 305, 120, 0]]);
    flock.setObstacles([{ x: 500, y: 300, radius: 120 }]);
    let closest = Infinity;
    for (let step = 0; step < 60 * 8; step++) {
      flock.step(1 / 60);
      closest = Math.min(closest, Math.hypot(flock.x[0]! - 500, flock.y[0]! - 300));
    }
    expect(closest).toBeGreaterThanOrEqual(120 - 0.01);
    // and it went round it, not back where it came from
    expect(flock.x[0]).toBeGreaterThan(500);
  });

  it('is pushed out of an obstacle that moved onto it', () => {
    const flock = new Boids({ ...QUIET, count: 1 }, 800, 600);
    place(flock, [[410, 300, 0, 0]]);
    flock.setObstacles([{ x: 400, y: 300, radius: 100 }]);
    flock.step(1 / 60);
    expect(Math.hypot(flock.x[0]! - 400, flock.y[0]! - 300)).toBeGreaterThanOrEqual(100);
  });

  it('stays out of an obstacle of any shape, by its own length: a square field', () => {
    const flock = new Boids({ ...QUIET, count: 1, minSpeed: 100, maxSpeed: 120 }, 2000, 600);
    place(flock, [[100, 300, 120, 0]]);
    // a square 200 px wide around (500, 300): the distance from its edge (Chebyshev, enough for a test)
    const square = (x: number, y: number) => Math.max(Math.abs(x - 500), Math.abs(y - 300)) - 100;
    flock.setField(square, 2, 10);
    let least = Infinity;
    for (let step = 0; step < 60 * 8; step++) {
      flock.step(1 / 60);
      least = Math.min(least, square(flock.x[0]!, flock.y[0]!));
    }
    expect(least).toBeGreaterThanOrEqual(10 - 0.01);
  });

  it('flies with its own colony only: two colonies heading apart do not turn into one flock', () => {
    const flock = new Boids({ ...QUIET, count: 2, alignment: 3, colonies: 2, perception: 200 }, 2000, 2000);
    place(flock, [[1000, 1000, 100, 0], [1000, 1010, 0, 100]]);
    run(flock, 0.5);
    // still each its own way: east and south
    expect(Math.abs(flock.vy[0]!)).toBeLessThan(1);
    expect(Math.abs(flock.vx[1]!)).toBeLessThan(1);
    // one colony: the one flying east turns south with the other
    const one = new Boids({ ...QUIET, count: 2, alignment: 3, colonies: 1, perception: 200 }, 2000, 2000);
    place(one, [[1000, 1000, 100, 0], [1000, 1010, 0, 100]]);
    run(one, 0.5);
    expect(one.vy[0]!).toBeGreaterThan(10);
  });

  it('flees the pointer when it is scared of it, and only near it', () => {
    const flock = new Boids({ ...QUIET, count: 2, follow: 'flee', followRadius: 150, followWeight: 1, maxSpeed: 150 }, 2000, 2000);
    place(flock, [[1000, 1000, 0, 0], [1500, 1000, 0, 0]]);
    flock.setTarget({ x: 950, y: 1000 });
    run(flock, 0.5);
    // the near one flew away from it, to the right; the far one did not move
    expect(flock.x[0]!).toBeGreaterThan(1030);
    expect(flock.x[1]!).toBeCloseTo(1500, 0);
  });

  it('flees what scares it (an element of the page)', () => {
    const flock = new Boids({ ...QUIET, count: 1 }, 2000, 2000);
    place(flock, [[1000, 1000, 0, 0]]);
    flock.setScares([{ x: 1000, y: 1050, radius: 200 }]);
    run(flock, 0.5);
    expect(flock.y[0]!).toBeLessThan(970);
    flock.setScares([], 0);
  });

  it('gives each colony a leader (its first boid), which the others of its colony follow', () => {
    const flock = new Boids({ ...QUIET, count: 6, colonies: 2, leaderPull: 1 }, 4000, 4000);
    expect(flock.leaders).toBe(2);
    expect([0, 1, 2].map((i) => flock.isLeader(i))).toEqual([true, true, false]);
    // boid 2 (colony 0) far to the right of its leader, boid 0
    place(flock, [[1000, 2000, 0, 0], [3000, 3000, 0, 0], [1600, 2000, 0, 0], [3000, 1000, 0, 0], [500, 500, 0, 0], [3500, 3500, 0, 0]]);
    run(flock, 1);
    expect(flock.x[2]!).toBeLessThan(1600);
  });

  it('every boid its own size, a little different; the leaders larger', () => {
    const flock = new Boids({ count: 200, colonies: 4, sizeVariety: 0.4, leaderSize: 1.9 }, 800, 600);
    const scales = flock.scales;
    expect([...scales.subarray(0, 4)]).toEqual([1.9, 1.9, 1.9, 1.9].map(Math.fround));
    const others = [...scales.subarray(4)];
    expect(Math.min(...others)).toBeGreaterThanOrEqual(0.8 - 1e-6);
    expect(Math.max(...others)).toBeLessThanOrEqual(1.2 + 1e-6);
    expect(Math.max(...others) - Math.min(...others)).toBeGreaterThan(0.2);
    flock.configure({ sizeVariety: 0, leaderSize: 1 });
    expect([...flock.scales].every((scale) => scale === 1)).toBe(true);
  });

  it('the small ones fly a little slower than the large ones, so the large ones end up ahead', () => {
    // two boids alone, flying the same way at full speed: a small one and a large one
    const flock = new Boids({ ...QUIET, count: 3, minSpeed: 150, maxSpeed: 150, sizeVariety: 1, leaderSize: 1.6, sizeSpeed: 0.5 }, 100000, 1000);
    // boid 0 is the leader (large); the others as their own numbers say: make boid 1 the smallest
    flock.own[1] = 0;
    flock.configure({ sizeVariety: 0.99 });
    place(flock, [[100, 500, 150, 0], [100, 500, 150, 0], [100, 900, 150, 0]]);
    run(flock, 2);
    expect(flock.scales[0]!).toBeGreaterThan(flock.scales[1]!);
    expect(flock.x[0]!).toBeGreaterThan(flock.x[1]! + 50);
  });

  it('the small ones follow their flock from a little farther', () => {
    // a small boid and a flock-mate at 80 px: past the sight of the others (70), within the small one's
    const make = (small: boolean) => {
      const flock = new Boids({ ...QUIET, count: 2, cohesion: 2, perception: 70, sizeVariety: 1, sizeReach: small ? 1 : 0 }, 4000, 4000);
      flock.own[1] = 0;
      flock.configure({ sizeVariety: 0.99 });
      place(flock, [[2000, 2000, 0, 0], [2000, 2080, 0, 0]]);
      run(flock, 0.5);
      return flock.y[1]!;
    };
    // with reach, the small one (boid 1) is drawn towards the other; without it, it does not see it
    expect(make(true)).toBeLessThan(2075);
    expect(make(false)).toBeCloseTo(2080, 0);
  });

  it('says which boid is nearest a point', () => {
    const flock = new Boids({ ...QUIET, count: 3 }, 800, 600);
    place(flock, [[100, 100, 0, 0], [500, 300, 0, 0], [700, 500, 0, 0]]);
    expect(flock.nearest(480, 320)).toEqual({ x: 500, y: 300 });
    expect(new Boids({ count: 0 }, 10, 10).nearest(0, 0)).toBeNull();
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

  it('a strong current carries a boid past its own top speed; out of it, that slows down', () => {
    // 2026-11-17, "a stronger push": a boid's own speed is capped, what the current carries it at is not
    const flock = new Boids({ ...QUIET, count: 1, maxSpeed: 120 }, 100000, 1000);
    place(flock, [[1000, 500, 0, 120]]);
    const strongest = currentsFlow([{ points: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }], strengths: [STRONGEST_CURRENT], width: 0.2 }], 100000, 1000)!;
    flock.setFlow(strongest);
    run(flock, 2);
    const from = flock.x[0]!;
    run(flock, 1);
    // its own 120 px/s and about half the push carried on top
    expect(flock.x[0]! - from).toBeGreaterThan(120 + STRONGEST_CURRENT * 0.4);
    expect(Math.hypot(flock.vx[0]!, flock.vy[0]!)).toBeLessThanOrEqual(120.01);
    flock.setFlow(null);
    run(flock, 2);
    expect(flock.carriedX[0]!).toBeLessThan(STRONGEST_CURRENT * 0.05);
  });

  it('keeps to its box: out of it, it hurries in, faster than its top speed; then it stays in it', () => {
    const flock = new Boids({ ...QUIET, count: 1, maxSpeed: 100 }, 3000, 3000);
    place(flock, [[200, 1500, 0, -100]]);
    flock.setHome({ left: 2000, top: 1400, right: 2600, bottom: 1600 });
    run(flock, 0.5);
    // 1800 px away: it flies at more than its own 100 px/s to get there
    expect(Math.hypot(flock.vx[0]!, flock.vy[0]!)).toBeGreaterThan(250);
    run(flock, 6);
    for (let second = 0; second < 4; second++) {
      run(flock, 1);
      expect(flock.x[0]!).toBeGreaterThan(2000 - 10);
      expect(flock.x[0]!).toBeLessThan(2600 + 10);
      expect(flock.y[0]!).toBeGreaterThan(1400 - 10);
      expect(flock.y[0]!).toBeLessThan(1600 + 10);
    }
    // in it, its own speed again
    expect(Math.hypot(flock.vx[0]!, flock.vy[0]!)).toBeLessThanOrEqual(100.01);
  });

  it('spreads under its box: a flock kept to a wide box covers it, not one corner of it', () => {
    const flock = new Boids({ count: 120, maxSpeed: 120 }, 2000, 2000, 5);
    flock.setHome({ left: 400, top: 800, right: 1600, bottom: 1100 });
    run(flock, 20);
    const inside = Array.from({ length: 120 }, (_, i) => i).filter((i) => flock.x[i]! > 380 && flock.x[i]! < 1620 && flock.y[i]! > 780 && flock.y[i]! < 1120);
    expect(inside.length).toBeGreaterThan(108);
    // each third of the box holds some of them
    for (const [from, to] of [[400, 800], [800, 1200], [1200, 1600]]) {
      expect(inside.filter((i) => flock.x[i]! >= from && flock.x[i]! < to).length).toBeGreaterThan(10);
    }
  });

  it('shares itself among several boxes (the lines of a text) by their area, each of them covered', () => {
    const flock = new Boids({ count: 90, maxSpeed: 120, colonies: 3, leaderPull: 0.4 }, 2000, 2000, 7);
    const lines = [
      { left: 400, top: 800, right: 1400, bottom: 840 },
      { left: 400, top: 860, right: 1400, bottom: 900 },
      { left: 400, top: 920, right: 900, bottom: 960 },
    ];
    flock.setHome(lines);
    run(flock, 10);
    const near = (i: number, line: (typeof lines)[number]) =>
      flock.x[i]! > line.left - 20 && flock.x[i]! < line.right + 20 && flock.y[i]! > line.top - 20 && flock.y[i]! < line.bottom + 20;
    const counts = lines.map((line) => Array.from({ length: 90 }, (_, i) => i).filter((i) => near(i, line)).length);
    // two long lines and a half one: about 36, 36 and 18, the leaders followed by nobody
    expect(counts[0]!).toBeGreaterThan(25);
    expect(counts[1]!).toBeGreaterThan(25);
    expect(counts[2]!).toBeGreaterThan(11);
    // every quarter of a long line is covered, its ends too
    for (let quarter = 0; quarter < 4; quarter++) {
      const from = 400 + quarter * 250;
      expect(Array.from({ length: 90 }, (_, i) => i).filter((i) => near(i, lines[0]!) && flock.x[i]! >= from && flock.x[i]! < from + 250).length).toBeGreaterThan(4);
    }
  });

  it('on the way to a far zone the flock comes apart in four streams, and comes together in it', () => {
    const flock = new Boids({ count: 80, maxSpeed: 110, colonies: 4, leaderPull: 0.4 }, 2000, 3000, 9);
    flock.setHome({ left: 900, top: 300, right: 1100, bottom: 400 });
    run(flock, 6);
    const width = () => {
      const xs = Array.from(flock.x.slice(0, 80));
      return Math.max(...xs) - Math.min(...xs);
    };
    const together = width();
    // the next zone: wide, far below
    flock.setHome({ left: 200, top: 2200, right: 1800, bottom: 2300 });
    run(flock, 1);
    expect(width()).toBeGreaterThan(together * 2);
    run(flock, 5);
    // there: under all of it, all its quarters
    for (let quarter = 0; quarter < 4; quarter++) {
      const from = 200 + quarter * 400;
      expect(Array.from({ length: 80 }, (_, i) => i).filter((i) => flock.x[i]! >= from && flock.x[i]! < from + 400 && flock.y[i]! > 2150 && flock.y[i]! < 2350).length).toBeGreaterThan(12);
    }
  });

  it('a space made larger keeps every boid where it was', () => {
    const flock = new Boids({ ...QUIET, count: 1 }, 1000, 800);
    place(flock, [[500, 400, 0, 0]]);
    flock.setSize(1000, 4000);
    expect(flock.x[0]!).toBe(500);
    expect(flock.y[0]!).toBe(400);
  });

  it('settled at its place in its box it hardly moves, and says it is there (away 0); on its way, away 1', () => {
    const flock = new Boids({ count: 40, maxSpeed: 110 }, 2000, 2000, 4);
    flock.setHome({ left: 600, top: 900, right: 1400, bottom: 1000 });
    run(flock, 12);
    const before = Array.from(flock.x.slice(0, 40));
    run(flock, 1);
    const moved = before.map((x, i) => Math.abs(flock.x[i]! - x));
    // in a second a free boid flies 60 px or more; settled, most move far less
    expect(moved.filter((d) => d < 25).length).toBeGreaterThan(30);
    expect(Math.max(...Array.from(flock.away.slice(0, 40)))).toBeLessThan(0.5);
    flock.setHome({ left: 600, top: 100, right: 1400, bottom: 200 });
    run(flock, 0.5);
    expect(Math.min(...Array.from(flock.away.slice(0, 40)))).toBeGreaterThan(0.7);
  });

  it('leaving a zone for another, the boids settled in it are thrown out of it, each away from its middle', () => {
    const flock = new Boids({ count: 40, maxSpeed: 110 }, 3000, 3000, 6);
    flock.setHome({ left: 1000, top: 1000, right: 1400, bottom: 1200 });
    run(flock, 12);
    const before = Array.from({ length: 40 }, (_, i) => [flock.x[i]!, flock.y[i]!] as const);
    flock.setHome({ left: 1000, top: 2400, right: 1400, bottom: 2600 });
    // at once: carried outwards from the old zone's middle (1200, 1100)
    const outwards = before.filter(([x, y], i) => (x - 1200) * flock.carriedX[i]! + (y - 1100) * flock.carriedY[i]! > 0);
    expect(outwards.length).toBeGreaterThan(30);
    expect(Math.max(...Array.from(flock.carriedX.slice(0, 40)).map(Math.abs))).toBeGreaterThan(200);
  });

  it('a zone that only moves a little (the page scrolled on the screen) throws nothing', () => {
    const flock = new Boids({ count: 10, maxSpeed: 110 }, 3000, 3000, 6);
    flock.setHome({ left: 1000, top: 1000, right: 1400, bottom: 1200 });
    run(flock, 6);
    const carried = Array.from(flock.carriedY.slice(0, 10));
    flock.setHome({ left: 1000, top: 990, right: 1400, bottom: 1190 });
    expect(Array.from(flock.carriedY.slice(0, 10))).toEqual(carried);
  });

  it('a honeycomb fills its box evenly, its edges too, with no more points than asked', () => {
    const points = honeycomb(600, 300, 120);
    expect(points.length).toBeLessThanOrEqual(120);
    expect(points.length).toBeGreaterThan(90);
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    expect(Math.min(...xs)).toBeLessThan(0.1);
    expect(Math.max(...xs)).toBeGreaterThan(0.9);
    expect(Math.min(...ys)).toBeLessThan(0.1);
    expect(Math.max(...ys)).toBeGreaterThan(0.9);
  });

  it('a current carries a boid neither through an edge nor into an obstacle', () => {
    const edged = new Boids({ ...QUIET, count: 1, edges: 'avoid', maxSpeed: 100 }, 400, 400);
    place(edged, [[200, 200, 100, 0]]);
    edged.setFlow(() => [STRONGEST_CURRENT, 0]);
    run(edged, 3);
    expect(edged.x[0]!).toBeLessThanOrEqual(400);

    const flock = new Boids({ ...QUIET, count: 1, minSpeed: 100, maxSpeed: 120 }, 2000, 600);
    place(flock, [[100, 305, 120, 0]]);
    flock.setObstacles([{ x: 500, y: 300, radius: 120 }]);
    flock.setFlow(() => [800, 0]);
    let closest = Infinity;
    for (let step = 0; step < 60 * 4; step++) {
      flock.step(1 / 60);
      closest = Math.min(closest, Math.hypot(flock.x[0]! - 500, flock.y[0]! - 300));
    }
    expect(closest).toBeGreaterThanOrEqual(120 - 0.01);
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

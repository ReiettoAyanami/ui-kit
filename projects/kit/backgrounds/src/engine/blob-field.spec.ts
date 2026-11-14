import { DEFAULT_BLOBS, MAX_BLOBS, blobEdge, blobsAt } from './blob-field';
import { BLOB_SHAPES } from './shapes';

describe('the blobs’ edge, for the flock', () => {
  const circle = { rotation: 0, from: BLOB_SHAPES.circle, to: BLOB_SHAPES.circle, mix: 0 };

  it('is the distance from a round blob’s edge, below 0 inside', () => {
    const edge = blobEdge([{ ...circle, x: 0, y: 0, radius: 100 }], 1);
    expect(edge(150, 0)).toBeCloseTo(50, 0);
    expect(edge(0, 50)).toBeCloseTo(-50, 0);
  });

  it('follows the shape: a clover’s dip is outside where its lobe is inside', () => {
    const edge = blobEdge([{ ...circle, from: BLOB_SHAPES.clover4, to: BLOB_SHAPES.clover4, x: 0, y: 0, radius: 100 }], 1);
    // a lobe at angle 0, a dip at 45°: at 90 px out, inside the lobe, outside the dip
    expect(edge(90, 0)).toBeLessThan(0);
    expect(edge(90 * Math.SQRT1_2, 90 * Math.SQRT1_2)).toBeGreaterThan(0);
  });

  it('takes in the gap where two blobs melt into one', () => {
    const blobs = [
      { ...circle, x: 0, y: 0, radius: 100 },
      { ...circle, x: 210, y: 0, radius: 100 },
    ];
    // the point between them, 5 px from each: outside both alone, inside once they melt
    expect(blobEdge(blobs, 1)(105, 0)).toBeGreaterThan(0);
    expect(blobEdge(blobs, 30)(105, 0)).toBeLessThan(0);
  });
});

describe('blobs of their own sizes', () => {
  it('takes each blob’s size from the list, round again, and moves no blob for it', () => {
    const plain = blobsAt({ ...DEFAULT_BLOBS, count: 4 }, 3, 1000, 800);
    const sized = blobsAt({ ...DEFAULT_BLOBS, count: 4, sizes: [0.2, 0.05] }, 3, 1000, 800);
    // the same places
    expect(sized.map((blob) => [blob.x, blob.y])).toEqual(plain.map((blob) => [blob.x, blob.y]));
    // a large one, a small one, a large one, a small one (each breathing a little: within 5%)
    expect(sized[0]!.radius / (0.2 * 800)).toBeCloseTo(1, 1);
    expect(sized[1]!.radius / (0.05 * 800)).toBeCloseTo(1, 1);
    expect(sized[2]!.radius).toBeGreaterThan(sized[3]!.radius * 3);
  });
});

describe('where the blobs are', () => {
  it('the same moment is always the same picture; another moment, another', () => {
    const now = blobsAt(DEFAULT_BLOBS, 12.5, 1280, 720);
    expect(blobsAt(DEFAULT_BLOBS, 12.5, 1280, 720)).toEqual(now);
    expect(blobsAt(DEFAULT_BLOBS, 20, 1280, 720)).not.toEqual(now);
    expect(blobsAt({ ...DEFAULT_BLOBS, seed: 2 }, 12.5, 1280, 720)).not.toEqual(now);
  });

  it('as many as asked, never more than the shader holds, sized by the smaller side', () => {
    expect(blobsAt({ ...DEFAULT_BLOBS, count: 3 }, 0, 800, 600)).toHaveLength(3);
    expect(blobsAt({ ...DEFAULT_BLOBS, count: 99 }, 0, 800, 600)).toHaveLength(MAX_BLOBS);
    for (const blob of blobsAt({ ...DEFAULT_BLOBS, size: 0.2, sizeVariety: 0 }, 3, 1000, 500)) {
      // a fifth of 500, breathing by 5%
      expect(blob.radius).toBeGreaterThan(94);
      expect(blob.radius).toBeLessThan(106);
    }
  });

  it('they stay around the space as they drift', () => {
    for (const time of [0, 30, 300, 3000]) {
      for (const blob of blobsAt(DEFAULT_BLOBS, time, 1000, 800)) {
        expect(blob.x).toBeGreaterThan(-300);
        expect(blob.x).toBeLessThan(1300);
        expect(blob.y).toBeGreaterThan(-300);
        expect(blob.y).toBeLessThan(1100);
      }
    }
  });

  it('with no morphing a blob keeps its shape; with it, the shapes change over time', () => {
    const still = { ...DEFAULT_BLOBS, morph: 0 };
    const shapesOf = (settings: typeof still, time: number) => blobsAt(settings, time, 800, 600).map((blob) => [blob.from, blob.to, blob.mix]);
    expect(shapesOf(still, 0)).toEqual(shapesOf(still, 500));
    for (const blob of blobsAt(still, 40, 800, 600)) expect(blob.mix).toBe(0);
    expect(shapesOf(DEFAULT_BLOBS, 0)).not.toEqual(shapesOf(DEFAULT_BLOBS, 500));
    const one = blobsAt({ ...DEFAULT_BLOBS, shapes: ['sunny'] }, 77, 800, 600);
    for (const blob of one) expect(blob.from).toBe(BLOB_SHAPES.sunny);
  });

  it('the pointer draws them when asked', () => {
    const pointer = { x: 900, y: 100 };
    const free = blobsAt(DEFAULT_BLOBS, 5, 1000, 800, pointer);
    const drawn = blobsAt({ ...DEFAULT_BLOBS, pull: 1 }, 5, 1000, 800, pointer);
    free.forEach((blob, i) => {
      expect(Math.hypot(drawn[i]!.x - 900, drawn[i]!.y - 100)).toBeLessThan(Math.hypot(blob.x - 900, blob.y - 100));
    });
  });
});

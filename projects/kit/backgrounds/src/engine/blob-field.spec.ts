import { DEFAULT_BLOBS, MAX_BLOBS, blobsAt } from './blob-field';
import { BLOB_SHAPES } from './shapes';

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

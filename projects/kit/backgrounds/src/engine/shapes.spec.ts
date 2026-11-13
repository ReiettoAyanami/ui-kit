import { BLOB_SHAPES, BLOB_SHAPE_NAMES, DEFAULT_BLOB_SHAPES, knownShapes, shapeRadius } from './shapes';

describe('the shapes of the blobs', () => {
  const around = (steps = 720) => Array.from({ length: steps }, (_, i) => (i / steps) * Math.PI * 2 - Math.PI);

  it('every shape closes on itself and stays inside its reach, never thinner than a third of it', () => {
    for (const name of BLOB_SHAPE_NAMES) {
      const shape = BLOB_SHAPES[name];
      // the same radius at -π and π: no seam
      expect(shapeRadius(shape, -Math.PI), name).toBeCloseTo(shapeRadius(shape, Math.PI), 6);
      for (const angle of around()) {
        const radius = shapeRadius(shape, angle);
        expect(radius, `${name} at ${angle}`).toBeLessThanOrEqual(1.000001);
        expect(radius, `${name} at ${angle}`).toBeGreaterThan(0.33);
      }
    }
  });

  it('a circle is round, a clover has its lobes, a polygon its corners', () => {
    for (const angle of around(36)) expect(shapeRadius(BLOB_SHAPES.circle, angle)).toBe(1);
    const dips = (name: keyof typeof BLOB_SHAPES) => {
      const radii = around().map((angle) => shapeRadius(BLOB_SHAPES[name], angle));
      return radii.filter((radius, i) => radius < radii[(i + 1) % radii.length]! && radius <= radii[(i - 1 + radii.length) % radii.length]!).length;
    };
    expect(dips('clover4')).toBe(4);
    expect(dips('cookie9')).toBe(9);
    expect(dips('triangle')).toBe(3);
    expect(dips('pentagon')).toBe(5);
  });

  it('keeps the names it knows, and falls back on the default shapes', () => {
    expect(knownShapes(['sunny', 'nothing', 'circle'])).toEqual(['sunny', 'circle']);
    expect(knownShapes([])).toEqual(DEFAULT_BLOB_SHAPES);
    expect(knownShapes(null)).toEqual(DEFAULT_BLOB_SHAPES);
  });
});

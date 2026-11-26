import { bezelShift, glassHeight, liquidGlassMaps, liquidGlassOutlineMaps } from './liquid-glass-maps';

const SHAPE = { width: 200, height: 120, radius: 24, bezel: 20, thickness: 40, ior: 1.5, surface: 'squircle' as const };

describe('liquidGlassMaps', () => {
  it('the bezel rises from the edge to the flat top; a lip goes back down', () => {
    expect(glassHeight('squircle', 0)).toBe(0);
    expect(glassHeight('squircle', 1)).toBe(1);
    expect(glassHeight('circle', 0.5)).toBeGreaterThan(0.8);
    expect(glassHeight('lip', 1)).toBeCloseTo(0);
  });

  it('bends nothing at the very edge nor on the flat middle, and something in between', () => {
    expect(bezelShift(SHAPE, 0)).toBe(0);
    expect(bezelShift(SHAPE, 20)).toBe(0);
    expect(Math.abs(bezelShift(SHAPE, 8))).toBeGreaterThan(0.1);
  });

  it('leaves the middle as it is and takes pixels from inwards near the edge, the same on both sides', () => {
    const maps = liquidGlassMaps(SHAPE);
    const at = (x: number, y: number) => (y * maps.width + x) * 4;
    const middle = at(100, 60);
    expect([maps.displacement[middle], maps.displacement[middle + 1]]).toEqual([128, 128]);
    // near the left edge, halfway up: it takes from the right (inwards), the right edge from the left
    const left = at(6, 60);
    const right = at(193, 60);
    expect(maps.displacement[left]!).toBeGreaterThan(128);
    expect(maps.displacement[right]!).toBeLessThan(128);
    expect(maps.displacement[left]! - 128).toBeCloseTo(128 - maps.displacement[right]!, -0.5);
    expect(maps.scale).toBeGreaterThan(0);
  });

  it("draws kube.io's thin line on the very edge, the same all round (no side of its own: the light under it chooses), none inside", () => {
    // lenzi, 2026-11-26: "la direzione della luce deve cambiare rispetto a quello che sta sotto": the map has no light
    const maps = liquidGlassMaps(SHAPE);
    const alpha = (x: number, y: number) => maps.specular[(y * maps.width + x) * 4 + 3]!;
    const colour = (x: number, y: number) => maps.specular[(y * maps.width + x) * 4]!;
    expect(alpha(100, 60)).toBe(0);
    expect(alpha(100, 1)).toBeGreaterThan(100);
    // top, bottom, left and right alike
    for (const [x, y] of [[100, 118], [1, 60], [198, 60]] as const) expect(Math.abs(alpha(x, y) - alpha(100, 1))).toBeLessThan(8);
    // a line about two pixels wide
    expect(alpha(100, 4)).toBe(0);
    // its colour the glint, its alpha the glint squared
    expect(Math.abs(colour(100, 1) - Math.round(255 * Math.sqrt(alpha(100, 1) / 255)))).toBeLessThan(3);
  });

  it('carries the line in the blue of the bending map, one picture for the filter, opaque everywhere', () => {
    const maps = liquidGlassMaps(SHAPE);
    const at = (x: number, y: number) => (y * maps.width + x) * 4;
    for (const [x, y] of [[100, 1], [100, 60], [1, 60], [6, 60]] as const) {
      expect(maps.displacement[at(x, y) + 2]).toBe(maps.specular[at(x, y)]);
      expect(maps.displacement[at(x, y) + 3]).toBe(255);
    }
  });

  it('fades its line across the pixels the round corners cross, no staircase (antialiased)', () => {
    const maps = liquidGlassMaps({ width: 40, height: 40, radius: 14, bezel: 10, thickness: 20, ior: 1.5, surface: 'squircle' });
    // along the corner's arc, on its second row: from nothing outside, through some, to the full line inside
    const row = Array.from({ length: 14 }, (_, x) => maps.specular[(1 * 40 + x) * 4 + 3]!);
    const full = Math.max(...row);
    expect(row[0]).toBe(0);
    expect(row.some((alpha) => alpha > 0 && alpha < full * 0.6)).toBe(true);
  });
});

describe('liquidGlassOutlineMaps', () => {
  // a disc of radius 40 in the middle of 100 × 100: what a canvas's alpha gives for it
  const size = 100;
  const inside = Array.from({ length: size * size }, (_, i) => (Math.hypot((i % size) + 0.5 - 50, Math.floor(i / size) + 0.5 - 50) <= 40 ? 255 : 0));
  const maps = liquidGlassOutlineMaps({ width: size, height: size, inside, bezel: 14, thickness: 30, ior: 1.5, surface: 'squircle' });
  const at = (x: number, y: number) => (y * size + x) * 4;

  it('follows the outline: the middle and what is outside stay as they are, the bezel takes from inwards', () => {
    expect([maps.displacement[at(50, 50)], maps.displacement[at(50, 50) + 1]]).toEqual([128, 128]);
    expect([maps.displacement[at(3, 3)], maps.displacement[at(3, 3) + 1]]).toEqual([128, 128]);
    // just inside the left edge, it takes from the right; the right edge from the left; the top from below
    expect(maps.displacement[at(15, 50)]!).toBeGreaterThan(128);
    expect(maps.displacement[at(84, 50)]!).toBeLessThan(128);
    expect(maps.displacement[at(50, 15) + 1]!).toBeGreaterThan(128);
    // the same on both sides, a pixel's steps apart
    expect(Math.abs(maps.displacement[at(15, 50)]! - 128 - (128 - maps.displacement[at(84, 50)]!))).toBeLessThan(12);
  });

  it('draws the line on its own edge all round, and nothing in the middle', () => {
    const alpha = (x: number, y: number) => maps.specular[at(x, y) + 3]!;
    expect(alpha(50, 50)).toBe(0);
    expect(alpha(50, 11)).toBeGreaterThan(100);
    expect(Math.abs(alpha(50, 11) - alpha(50, 88))).toBeLessThan(12);
    expect(Math.abs(alpha(11, 50) - alpha(50, 11))).toBeLessThan(12);
  });
});


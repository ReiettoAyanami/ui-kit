import { bezelShift, glassHeight, liquidGlassMaps, liquidGlassOutlineMaps } from './liquid-glass-maps';

const SHAPE = { width: 200, height: 120, radius: 24, bezel: 20, thickness: 40, ior: 1.5, surface: 'squircle' as const, lightAngle: -60 };

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

  it('lights only the very edge, most where it faces the light (top left), none in the middle', () => {
    const maps = liquidGlassMaps(SHAPE);
    const alpha = (x: number, y: number) => maps.specular[(y * maps.width + x) * 4 + 3]!;
    expect(alpha(100, 60)).toBe(0);
    expect(alpha(100, 0)).toBeGreaterThan(alpha(100, 119));
    expect(alpha(100, 10)).toBe(0);
  });

  it('has a rim for each side the light may come from and one all round, none lit in the middle', () => {
    const maps = liquidGlassMaps(SHAPE);
    expect(maps.rims.length).toBe(9);
    expect(maps.rims.at(-1)!.angle).toBeNull();
    const alpha = (data: Uint8ClampedArray, x: number, y: number) => data[(y * maps.width + x) * 4 + 3]!;
    const fromLeft = maps.rims.find((rim) => rim.angle === 180)!.data;
    expect(alpha(fromLeft, 0, 60)).toBeGreaterThan(alpha(fromLeft, 199, 60));
    const round = maps.rims.at(-1)!.data;
    expect(alpha(round, 0, 60)).toBe(alpha(round, 199, 60));
    expect(alpha(round, 100, 60)).toBe(0);
  });
});

describe('liquidGlassOutlineMaps', () => {
  // a disc of radius 40 in the middle of 100 × 100: what a canvas's alpha gives for it
  const size = 100;
  const inside = Array.from({ length: size * size }, (_, i) => (Math.hypot((i % size) + 0.5 - 50, Math.floor(i / size) + 0.5 - 50) <= 40 ? 255 : 0));
  const maps = liquidGlassOutlineMaps({ width: size, height: size, inside, bezel: 14, thickness: 30, ior: 1.5, surface: 'squircle', lightAngle: -90 });
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

  it('lights its own edge, from where the light is, and nothing in the middle', () => {
    const alpha = (x: number, y: number) => maps.specular[at(x, y) + 3]!;
    expect(alpha(50, 50)).toBe(0);
    expect(alpha(50, 11)).toBeGreaterThan(alpha(50, 88));
  });
});


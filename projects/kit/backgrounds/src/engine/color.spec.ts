import { DEFAULT_SPREAD, SPREAD_HUE, displacedColor, displacedColors, hexToLinear, linearToHex, linearToOklch, luminance, oklchToLinear, seeded } from './color';

describe('the colours of a glowing background', () => {
  const violet = hexToLinear('#d5baff');

  it('goes from hex to linear light and back', () => {
    expect(linearToHex(hexToLinear('#d5baff'))).toBe('#d5baff');
    expect(hexToLinear('#ffffff')).toEqual([1, 1, 1]);
    expect(hexToLinear('nonsense')).toEqual([0, 0, 0]);
    expect(luminance(hexToLinear('#ffffff'))).toBeCloseTo(1);
    expect(luminance(hexToLinear('#1f1f22'))).toBeLessThan(0.05);
  });

  it('goes through OKLCH and back without moving the colour', () => {
    for (const hex of ['#d5baff', '#6ed889', '#ff5449', '#00dddd', '#808080']) {
      expect(linearToHex(oklchToLinear(linearToOklch(hexToLinear(hex)))), hex).toBe(hex);
    }
  });

  it('gives every object its own colour, the same at every frame and every visit', () => {
    const first = displacedColor(violet, 0);
    expect(displacedColor(violet, 0)).toEqual(first);
    expect(displacedColor(violet, 1)).not.toEqual(first);
    expect(displacedColor(violet, 0, DEFAULT_SPREAD, 2)).not.toEqual(first);
    expect(seeded(7)()).toBe(seeded(7)());
  });

  it('moves the colour a little by default: the hue stays within 12 degrees of the accent', () => {
    const accent = linearToOklch(violet);
    for (let index = 0; index < 200; index++) {
      const moved = linearToOklch(displacedColor(violet, index));
      const turn = Math.abs(((moved.h - accent.h + 540) % 360) - 180);
      // the screen clips the most saturated ones: a degree of slack
      expect(turn, `object ${index}`).toBeLessThanOrEqual(SPREAD_HUE * DEFAULT_SPREAD + 1.5);
    }
  });

  it('with no spread every object is the accent; with more, they differ more', () => {
    expect(displacedColor(violet, 5, 0)).toEqual(violet);
    const far = (spread: number) => {
      let total = 0;
      for (let index = 0; index < 100; index++) {
        const moved = linearToOklch(displacedColor(violet, index, spread));
        total += Math.abs(((moved.h - linearToOklch(violet).h + 540) % 360) - 180);
      }
      return total;
    };
    expect(far(1)).toBeGreaterThan(far(0.2) * 2);
  });

  it('packs the colours of many objects for the GPU', () => {
    const colors = displacedColors(violet, 3);
    expect(colors).toHaveLength(9);
    expect([...colors.slice(3, 6)]).toEqual([...new Float32Array(displacedColor(violet, 1))]);
  });
});

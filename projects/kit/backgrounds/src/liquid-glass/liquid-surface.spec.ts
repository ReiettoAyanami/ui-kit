import { liquidGlassMaps } from './liquid-glass-maps';
import { LIGHT_BASE, LIGHT_FLOOR, SLICE_AREA, bendLimit, glassCuts, lightMatrix } from './liquid-surface';

const OPTICS = { bezel: 14, thickness: 28, ior: 1.5, surface: 'squircle' as const };

describe('glassCuts (a large glass in nine pieces, 2026-11-25)', () => {
  it('a small glass is one picture, a large one nine pieces that cover all of it', () => {
    expect(glassCuts(200, 120, 24, 14)).toBeNull();
    expect(SLICE_AREA).toBeGreaterThan(200 * 120);
    const cuts = glassCuts(900, 2400, 24, 14)!;
    expect(cuts.pieces.length).toBe(9);
    // every px of the glass lies under a piece
    const covered = (x: number, y: number) => cuts.pieces.some(([, , , , px, py, w, h]) => x >= px && x < px + w && y >= py && y < py + h);
    for (const [x, y] of [[0, 0], [899, 0], [0, 2399], [899, 2399], [450, 0], [450, 2399], [0, 1200], [899, 1200], [450, 1200], [26, 26], [27, 27], [873, 2373]] as const) {
      expect(covered(x, y)).toBe(true);
    }
  });

  it('the pieces make the same maps as one picture of the whole glass, px by px, with no seam', () => {
    const width = 420;
    const height = 380;
    const radius = 24;
    const cuts = glassCuts(width, height, radius, OPTICS.bezel)!;
    expect(cuts).not.toBeNull();
    const whole = liquidGlassMaps({ width, height, radius, ...OPTICS });
    const small = liquidGlassMaps({ width: cuts.side, height: cuts.side, radius, ...OPTICS });
    expect(small.scale).toBeCloseTo(whole.scale, 6);
    let worst = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // the last piece over this px is what the filter shows (the corners over the sides over the middle)
        const piece = [...cuts.pieces].reverse().find(([, , , , px, py, w, h]) => x >= px && x < px + w && y >= py && y < py + h)!;
        const [fx, fy, fw, fh, px, py, w, h] = piece;
        const sx = fx + Math.floor(((x - px) * fw) / w);
        const sy = fy + Math.floor(((y - py) * fh) / h);
        const from = (sy * cuts.side + sx) * 4;
        const to = (y * width + x) * 4;
        // the one map: the bending and, in its blue, the line on the edge
        for (let k = 0; k < 4; k++) worst = Math.max(worst, Math.abs(small.displacement[from + k]! - whole.displacement[to + k]!));
      }
    }
    expect(worst).toBeLessThanOrEqual(1);
  });
});

describe('the light under the glass (lenzi, 2026-11-26: "la direzione della luce deve cambiare rispetto a quello che sta sotto")', () => {
  // the filter's colour matrix on one colour (0 to 1): its colour and how much light it is
  const lit = (r: number, g: number, b: number) => {
    const m = lightMatrix().split(' ').map(Number);
    const row = (k: number) => Math.min(1, Math.max(0, m[k * 5]! * r + m[k * 5 + 1]! * g + m[k * 5 + 2]! * b + m[k * 5 + 4]!));
    return { r: row(0), g: row(1), b: row(2), a: row(3) };
  };

  it("the page's dark colour is only a faint base (the shape still reads); a bright thing under the glass is all of it", () => {
    expect(lit(LIGHT_FLOOR, LIGHT_FLOOR, LIGHT_FLOOR).a).toBeCloseTo(LIGHT_BASE, 5);
    expect(lit(0.12, 0.12, 0.13).a).toBeLessThan(0.15);
    expect(lit(0, 0, 0).a).toBe(0);
    expect(lit(0.85, 0.7, 0.95).a).toBe(1);
    // brighter, more light
    expect(lit(0.4, 0.4, 0.4).a).toBeGreaterThan(lit(0.3, 0.3, 0.3).a);
  });

  it('its colour is what is under it, paler', () => {
    const violet = lit(0.8, 0.2, 1);
    expect(violet.b).toBeGreaterThan(violet.g);
    expect(violet.g).toBeGreaterThanOrEqual(0.5);
  });
});

describe('bendLimit (lenzi, 2026-11-26, the word under a capsule mirrored: "cosí é buggato")', () => {
  it("never lets the bezel take what lies past the glass's middle", () => {
    // a capsule 70 by 33 with an 11 px bezel: at most half of 33, less half the bezel
    expect(bendLimit(70, 33, 11)).toBeCloseTo(11, 5);
    // a large panel bends as it likes
    expect(bendLimit(900, 600, 24)).toBe(288);
    // never nothing
    expect(bendLimit(4, 4, 12)).toBe(1);
  });
});

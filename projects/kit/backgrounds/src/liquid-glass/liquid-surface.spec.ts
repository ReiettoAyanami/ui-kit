import { liquidGlassMaps } from './liquid-glass-maps';
import { LIGHT_BASE, LIGHT_FLOOR, SLICE_AREA, SQUIRCLE_CONCENTRIC, bendLimit, concentric, cornerOf, glassCuts, glassPlace, lightMatrix } from './liquid-surface';

const OPTICS = { bezel: 14, thickness: 28, ior: 1.5, surface: 'squircle' as const };

describe('glassCuts (a large glass in nine pieces, 2026-11-25)', () => {
  it('a tiny glass is one picture, any other nine pieces that cover all of it (2026-11-26: small glass too)', () => {
    expect(glassCuts(60, 40, 24, 14)).toBeNull();
    expect(SLICE_AREA).toBeGreaterThan(60 * 40);
    expect(glassCuts(258, 144, 11, 24)).not.toBeNull();
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

  it("the page's dark colour lights nothing (highlights or a border, never a line all round); a bright thing is all of it", () => {
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

describe('glassPlace (lenzi, 2026-11-26: "non funziona con altri layer di liquidglass ... solo con quello che gli sta sotto direttamente")', () => {
  // a computed style, as the browser gives it
  const style = (props: Partial<Record<string, string>>) => {
    const all: Record<string, string> = {
      overflowX: 'visible',
      overflowY: 'visible',
      clipPath: 'none',
      filter: 'none',
      mixBlendMode: 'normal',
      borderTopWidth: '1px',
      borderRightWidth: '1px',
      borderBottomWidth: '1px',
      borderLeftWidth: '1px',
      borderTopColor: 'rgba(0, 0, 0, 0)',
      'mask-image': 'none',
      ...props,
    };
    return { ...all, getPropertyValue: (name: string) => all[name] ?? '' } as unknown as CSSStyleDeclaration;
  };

  const round = { rx: 24, ry: 24, shape: 'round' as const };

  it('a glass that may hold glass bends on a layer behind what it holds, over its clear border', () => {
    expect(glassPlace(style({}), 300, 200, round, true)).toEqual({ layer: true, edge: 1, width: 300, height: 200, corner: round });
    // cut at the border's outer edge: still over it
    expect(glassPlace(style({ overflowX: 'clip', overflowY: 'clip', 'overflow-clip-margin': 'border-box' }), 300, 200, round, true).edge).toBe(1);
  });

  it('a border that shows, or one cut at, keeps the layer inside it: the inside, its corners concentric', () => {
    const inside = { layer: true, edge: 0, width: 298, height: 198, corner: { rx: 23, ry: 23, shape: 'round' } };
    expect(glassPlace(style({ borderTopColor: 'rgb(73, 69, 79)' }), 300, 200, round, true)).toEqual(inside);
    expect(glassPlace(style({ overflowX: 'hidden', overflowY: 'hidden' }), 300, 200, round, true)).toEqual(inside);
    // a squircle shrinks 1.84 times the border
    const squircle = glassPlace(style({ borderTopColor: 'rgb(73, 69, 79)' }), 300, 200, { rx: 24, ry: 24, shape: 'squircle' }, true);
    expect(squircle.corner.rx).toBeCloseTo(24 - SQUIRCLE_CONCENTRIC, 5);
  });

  it('on the glass itself where a layer cannot be: it scrolls, it is a root anyway (a mask), or a thumb', () => {
    const self = { layer: false, edge: 0, width: 300, height: 200, corner: round };
    expect(glassPlace(style({ overflowY: 'auto' }), 300, 200, round, true)).toEqual(self);
    expect(glassPlace(style({ 'mask-image': 'url("cat.svg")' }), 300, 200, round, true)).toEqual(self);
    expect(glassPlace(style({ filter: 'blur(2px)' }), 300, 200, round, true)).toEqual(self);
    expect(glassPlace(style({}), 300, 200, round, false)).toEqual(self);
  });
});

describe('the corners (lenzi, 2026-11-26: "Usa la formula giusta per ogni tipo arrotondazione differente")', () => {
  const style = (radius: string, shape = 'round') =>
    ({ borderTopLeftRadius: radius, getPropertyValue: (name: string) => (name === 'corner-shape' ? shape : '') }) as unknown as CSSStyleDeclaration;

  it("reads an ellipse's radii, a percentage, and the shape", () => {
    expect(cornerOf(style('12px 8px'), 200, 100)).toEqual({ rx: 12, ry: 8, shape: 'round' });
    expect(cornerOf(style('50%'), 56, 56)).toEqual({ rx: 28, ry: 28, shape: 'round' });
    expect(cornerOf(style('20px', 'squircle'), 200, 100).shape).toBe('squircle');
    // never more than half the glass
    expect(cornerOf(style('999px'), 120, 40)).toEqual({ rx: 60, ry: 20, shape: 'round' });
  });

  it('concentric: a round corner d px inside shrinks by d, a squircle by 1.84 d (the gap the same across the corner)', () => {
    expect(concentric('round')).toBe(1);
    expect(SQUIRCLE_CONCENTRIC).toBeCloseTo(1.841, 3);
    // the squircle's corner point (45°) of the outer and of the inner, d apart along the diagonal
    const R = 40;
    const d = 8;
    const r = R - concentric('squircle') * d;
    const at45 = (radius: number, inset: number) => inset + radius * (1 - 2 ** -0.25);
    expect(Math.SQRT2 * (at45(r, d) - at45(R, 0))).toBeCloseTo(d, 5);
  });
});

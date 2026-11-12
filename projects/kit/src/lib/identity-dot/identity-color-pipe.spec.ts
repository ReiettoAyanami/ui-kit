import { identityColor } from './identity-color';
import { LenziIdentityColorPipe } from './identity-color-pipe';

// These values freeze the algorithm (RULES.md, "Identity colours"; substance-tracker's own test,
// all violet since 2026-10-02): changing them would repaint every entity of every app.
// substance-tracker's "substance" is offset 0, its "batch" offset 0.5.
describe('identityColor', () => {
  it('gives an id a hue of the band, a lightness by id % 3 and the most chroma sRGB shows', () => {
    expect(identityColor(1)).toBe('oklch(0.74 0.179 309.4)');
    expect(identityColor(2)).toBe('oklch(0.6 0.22 278.9)');
    expect(identityColor(3)).toBe('oklch(0.88 0.107 328.3)');
  });

  it('puts a second kind of entity half the band away: id 1 of each kind differ', () => {
    expect(identityColor(1, 0.5)).toBe('oklch(0.74 0.133 269.4)');
    expect(identityColor(2, 0.5)).toBe('oklch(0.6 0.22 318.9)');
  });

  it('keeps every hue within the band, blue-violet to magenta', () => {
    expect(identityColor(1000)).toBe('oklch(0.74 0.133 262.7)');
    expect(identityColor(1000, 0.5)).toBe('oklch(0.74 0.163 302.7)');
    for (let id = 1; id <= 200; id++) {
      for (const offset of [0, 0.5]) {
        const hue = Number(identityColor(id, offset).match(/ ([\d.]+)\)$/)![1]);
        expect(hue).toBeGreaterThanOrEqual(260);
        expect(hue).toBeLessThanOrEqual(340);
      }
    }
  });

  it('folds a negative id back into the band', () => {
    const hue = Number(identityColor(-7).match(/ ([\d.]+)\)$/)![1]);
    expect(hue).toBeGreaterThanOrEqual(260);
    expect(hue).toBeLessThanOrEqual(340);
  });
});

describe('LenziIdentityColorPipe', () => {
  it('is the same colour as the function', () => {
    const pipe = new LenziIdentityColorPipe();
    expect(pipe.transform(1)).toBe(identityColor(1));
    expect(pipe.transform(2, 0.5)).toBe(identityColor(2, 0.5));
  });
});

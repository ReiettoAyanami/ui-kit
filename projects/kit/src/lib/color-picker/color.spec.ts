import { hexToHsv, hsvToHex, parseHexColor, toHexColor } from './color';

describe('the colour arithmetic', () => {
  it('reads a hex colour however it is written, and nothing else', () => {
    expect(parseHexColor('#D5BAFF')).toBe('#d5baff');
    expect(parseHexColor('d5baff')).toBe('#d5baff');
    expect(parseHexColor(' #f59 ')).toBe('#ff5599');
    expect(parseHexColor('#f5')).toBeNull();
    expect(parseHexColor('#d5baffaa')).toBeNull();
    expect(parseHexColor('red')).toBeNull();
  });

  it('knows the pure colours', () => {
    expect(hexToHsv('#ff0000')).toEqual({ h: 0, s: 1, v: 1 });
    expect(hexToHsv('#00ff00')).toEqual({ h: 120, s: 1, v: 1 });
    expect(hexToHsv('#0000ff')).toEqual({ h: 240, s: 1, v: 1 });
    expect(hsvToHex({ h: 60, s: 1, v: 1 })).toBe('#ffff00');
    expect(hsvToHex({ h: 360, s: 1, v: 1 })).toBe('#ff0000');
    expect(hsvToHex({ h: 200, s: 0, v: 0.5 })).toBe('#808080');
  });

  it('a grey keeps the hue the selector was on', () => {
    expect(hexToHsv('#808080', 210).h).toBe(210);
    expect(hexToHsv('#000000', 210)).toEqual({ h: 210, s: 0, v: 0 });
  });

  it('gives back the colour it was given, for every step of 17 on each channel', () => {
    for (let r = 0; r < 256; r += 17) {
      for (let g = 0; g < 256; g += 17) {
        for (let b = 0; b < 256; b += 17) {
          const hex = `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
          expect(hsvToHex(hexToHsv(hex))).toBe(hex);
        }
      }
    }
    for (const hex of ['#d5baff', '#00dddd', '#1f1f22', '#6ed889', '#ff8a80', '#010203']) expect(hsvToHex(hexToHsv(hex))).toBe(hex);
  });

  it('brings a CSS colour to hex, without its transparency', () => {
    expect(toHexColor('#D5BAFF')).toBe('#d5baff');
    expect(toHexColor('#d5baff80')).toBe('#d5baff');
    expect(toHexColor('rgb(213, 186, 255)')).toBe('#d5baff');
    expect(toHexColor('rgba(0 221 221 / 50%)')).toBe('#00dddd');
  });
});

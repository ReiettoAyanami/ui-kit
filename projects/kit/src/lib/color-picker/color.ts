// The colour arithmetic of the colour picker: a hex colour, the same colour as the selector moves it
// (hue, saturation, brightness), and any CSS colour brought to hex. A plain module (no schematic
// makes one).

/** A colour as the selector moves it: hue in degrees (0 to 360), saturation and brightness from 0 to 1. */
export interface LenziHsv {
  h: number;
  s: number;
  v: number;
}

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB = /^rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)/i;

const byte = (channel: number) => Math.min(255, Math.max(0, Math.round(channel))).toString(16).padStart(2, '0');

/** `#rrggbb` in lower case from `#RGB` or `#RRGGBB`, with or without the `#`; null when it is not one. */
export function parseHexColor(text: string): string | null {
  const digits = HEX.exec(text.trim())?.[1]?.toLowerCase();
  if (!digits) return null;
  return `#${digits.length === 3 ? [...digits].map((digit) => digit + digit).join('') : digits}`;
}

/**
 * A hex colour as hue, saturation and brightness. A grey has no hue of its own: it keeps `hueOfGrey`
 * (the hue the selector was on), so its thumb does not jump back to red.
 */
export function hexToHsv(hex: string, hueOfGrey = 0): LenziHsv {
  const number = parseInt((parseHexColor(hex) ?? '#000000').slice(1), 16);
  const r = ((number >> 16) & 255) / 255;
  const g = ((number >> 8) & 255) / 255;
  const b = (number & 255) / 255;
  const max = Math.max(r, g, b);
  const spread = max - Math.min(r, g, b);
  let h = hueOfGrey;
  if (spread > 0) {
    if (max === r) h = ((g - b) / spread + 6) % 6;
    else if (max === g) h = (b - r) / spread + 2;
    else h = (r - g) / spread + 4;
    h *= 60;
  }
  return { h, s: max === 0 ? 0 : spread / max, v: max };
}

/** Hue, saturation and brightness as `#rrggbb`. */
export function hsvToHex({ h, s, v }: LenziHsv): string {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255;
  };
  return `#${byte(channel(5))}${byte(channel(3))}${byte(channel(1))}`;
}

function rgbToHex(text: string): string | null {
  const match = RGB.exec(text.trim());
  return match ? `#${byte(Number(match[1]))}${byte(Number(match[2]))}${byte(Number(match[3]))}` : null;
}

/** What the browser paints for a colour it knows in another space (`oklch()`, `color-mix()`): one pixel of it. */
function paintedHex(color: string): string | null {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return null;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

/**
 * Any CSS colour as the `#rrggbb` the selector works with: a hex, `rgb()`, a name, `oklch()`, a
 * variable (`var(--mat-sys-primary)`, read where `host` is). Its transparency is dropped; black when
 * the browser cannot tell.
 */
export function toHexColor(css: string, host?: Element | null): string {
  const text = css.trim();
  const direct = parseHexColor(text) ?? (/^#[0-9a-f]{8}$/i.test(text) ? text.slice(0, 7).toLowerCase() : null) ?? rgbToHex(text);
  if (direct) return direct;
  if (typeof document === 'undefined') return '#000000';
  const probe = document.createElement('span');
  probe.style.display = 'none';
  probe.style.color = text;
  (host ?? document.body).appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  return rgbToHex(computed) ?? paintedHex(computed) ?? '#000000';
}

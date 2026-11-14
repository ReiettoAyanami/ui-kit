// The paint worklet that draws the lamps' light on a lit or solid surface, with the shadows of the solid
// elements cut out of it (lenzi, 2026-11-14: "it could be cool to introduce a faint hard shadow ... for if a
// solid component is interacting with light"). CSS gradients cannot take light away inside a polygon; a
// paint worklet can. LenziLightField measures everything and gives each surface, in
// `--lenzi-light-data`, its lamps and the shadows that fall on it, in its own px; the worklet only draws.
// Where the browser has no paint worklets (Firefox, Safari) the surfaces keep the gradients, without
// shadows. A plain module (no schematic makes one): the worklet's source, as text.

/** The worklet's name in CSS: `paint(lenzi-light)`. */
export const LIGHT_PAINT = 'lenzi-light';

/**
 * How a lamp's light fades: [where, 0 at the lamp's outline to 1 at its reach; how much of it]. Over the
 * lamp itself it is the first. The worklet and the CSS gradients (no worklet) use the same.
 */
export const LIGHT_STOPS: readonly (readonly [number, number])[] = [
  [0, 0.6],
  [0.15, 0.48],
  [0.38, 0.3],
  [0.68, 0.12],
  [1, 0],
];

/**
 * `--lenzi-light-data` is a CSS string holding JSON: a list of lights, each
 * `[left, top, right, bottom, reach, r, g, b, strength, shadows]` (a lamp: its box, in the surface's px; its
 * light fades out `reach` px off its outline; `shadows` a list of polygons, flat lists of x, y) or
 * `[0, 0, 0, 0, -1, r, g, b, strength]` (an even
 * light over the whole surface: a lamp's own). `--lenzi-light-part` says which amount to use: `veil`
 * (`--lenzi-glow-veil`) or `rim` (`--lenzi-glow-rim`); `--lenzi-shadow` how much light a shadow takes away.
 */
export const LIGHT_WORKLET = `
registerPaint('${LIGHT_PAINT}', class {
  static get inputProperties() {
    return ['--lenzi-light-data', '--lenzi-light-part', '--lenzi-glow-veil', '--lenzi-glow-rim', '--lenzi-shadow'];
  }

  paint(ctx, size, props) {
    const raw = String(props.get('--lenzi-light-data') || '').trim().replace(/^['"]|['"]$/g, '');
    if (!raw || raw === 'none') return;
    let lights;
    try {
      lights = JSON.parse(raw);
    } catch {
      return;
    }
    const part = String(props.get('--lenzi-light-part') || '').trim();
    const percent = (name, otherwise) => {
      const value = parseFloat(String(props.get(name) || ''));
      return Number.isFinite(value) ? Math.min(1, Math.max(0, value / 100)) : otherwise;
    };
    const amount = part === 'rim' ? percent('--lenzi-glow-rim', 1) : percent('--lenzi-glow-veil', 0.7);
    const shadow = percent('--lenzi-shadow', 0.6);
    const { width, height } = size;
    // lights add up
    ctx.globalCompositeOperation = 'lighter';
    for (const [left, top, right, bottom, reach, r, g, b, strength, shadows] of lights) {
      const alpha = (share) => 'rgba(' + r + ',' + g + ',' + b + ',' + Math.min(1, amount * strength * share) + ')';
      if (reach < 0) {
        ctx.fillStyle = alpha(1);
        ctx.fillRect(0, 0, width, height);
        continue;
      }
      // near the lamp the light is strong, then fades slowly: a light, not a disc. It lies over the whole
      // lamp and all round it, so it starts below full: two lamps side by side do not wash each other out
      const stops = (gradient) => {
        gradient.addColorStop(0, alpha(${LIGHT_STOPS[0]![1]}));
        ${LIGHT_STOPS.slice(1)
          .map(([at, share]) => `gradient.addColorStop(${at}, alpha(${share}));`)
          .join('\n        ')}
        return gradient;
      };
      // the light fades with the distance from the lamp's outline, all around it, so it is centred on the
      // lamp whatever its shape (lenzi, 2026-11-14: "they're generally uncentered"): full over the lamp,
      // a linear fade off each side, a round one off each corner (nine pieces that do not overlap)
      const light = () => {
        ctx.fillStyle = alpha(${LIGHT_STOPS[0]![1]});
        ctx.fillRect(left, top, right - left, bottom - top);
        const side = (x0, y0, x1, y1, x, y, w, h) => {
          ctx.fillStyle = stops(ctx.createLinearGradient(x0, y0, x1, y1));
          ctx.fillRect(x, y, w, h);
        };
        side(0, top, 0, top - reach, left, top - reach, right - left, reach);
        side(0, bottom, 0, bottom + reach, left, bottom, right - left, reach);
        side(left, 0, left - reach, 0, left - reach, top, reach, bottom - top);
        side(right, 0, right + reach, 0, right, top, reach, bottom - top);
        const corner = (x, y, cx, cy) => {
          ctx.fillStyle = stops(ctx.createRadialGradient(cx, cy, 0, cx, cy, reach));
          ctx.fillRect(x, y, reach, reach);
        };
        corner(left - reach, top - reach, left, top);
        corner(right, top - reach, right, top);
        corner(left - reach, bottom, left, bottom);
        corner(right, bottom, right, bottom);
      };
      if (!shadows || shadows.length === 0) {
        light();
        continue;
      }
      const trace = (points) => {
        ctx.moveTo(points[0], points[1]);
        for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
        ctx.closePath();
      };
      // the light outside every shadow: each clip takes one shadow away (clips add up as an intersection)
      ctx.save();
      for (const points of shadows) {
        ctx.beginPath();
        ctx.rect(-1, -1, width + 2, height + 2);
        trace(points);
        ctx.clip('evenodd');
      }
      light();
      ctx.restore();
      // inside them, what the shadow leaves of it: hard edges, and faint
      if (shadow < 1) {
        ctx.save();
        ctx.beginPath();
        for (const points of shadows) trace(points);
        ctx.clip('nonzero');
        ctx.globalAlpha = 1 - shadow;
        light();
        ctx.restore();
      }
    }
  }
});
`;

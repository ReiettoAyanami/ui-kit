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
 * `--lenzi-light-data` is a CSS string holding JSON: a list of lights, each
 * `[x, y, reach, r, g, b, strength, shadows]` (a lamp: a light from the point x, y that fades out at
 * `reach` px; `shadows` a list of polygons, flat lists of x, y) or `[0, 0, -1, r, g, b, strength]` (an even
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
    for (const [x, y, reach, r, g, b, strength, shadows] of lights) {
      const alpha = (share) => 'rgba(' + r + ',' + g + ',' + b + ',' + Math.min(1, amount * strength * share) + ')';
      if (reach < 0) {
        ctx.fillStyle = alpha(1);
        ctx.fillRect(0, 0, width, height);
        continue;
      }
      // near the lamp the light is strong, then fades slowly: a light, not a disc
      const light = ctx.createRadialGradient(x, y, 0, x, y, reach);
      light.addColorStop(0, alpha(1));
      light.addColorStop(0.15, alpha(0.82));
      light.addColorStop(0.38, alpha(0.5));
      light.addColorStop(0.68, alpha(0.2));
      light.addColorStop(1, alpha(0));
      ctx.fillStyle = light;
      if (!shadows || shadows.length === 0) {
        ctx.fillRect(0, 0, width, height);
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
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      // inside them, what the shadow leaves of it: hard edges, and faint
      if (shadow < 1) {
        ctx.save();
        ctx.beginPath();
        for (const points of shadows) trace(points);
        ctx.clip('nonzero');
        ctx.globalAlpha = 1 - shadow;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }
  }
});
`;

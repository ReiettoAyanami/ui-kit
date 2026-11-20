// Blobs of a material (lenzi, 2026-11-14: "Fai in modo che i blob possano anche essere di vetro o solidi e
// interagire allo stesso modo delle componenti che abbiamo fatto oggi"): a lamp (light: it glows, it lights
// what is around it), glass (it blurs what is behind it and takes the light around it, on its face and along
// its edge, as `lenziLit`) or solid (opaque, lit on the side that faces the light, and it stops the light: a
// hard shadow on the glow behind it, as `lenziSolid`). Blobs of one material melt into one another; blobs of
// two materials never do ("possono blobbarsi solo assieme ai blob ... dello stesso materiale").
//
// Every object (a blob of a background, a boid that is a blob) adds its share to a field, drawn with one quad
// each, as large as its reach, into half-float textures half the canvas's size: where the field reaches 1 is
// its material's edge. The lamps' field is turned into light (it glows and blooms with the rest); the glass's
// and the solid's are drawn over the finished picture; the solid things and the lamps make a small shadow
// texture, the share of the glow stopped at every place. A plain module (no schematic makes one).

import { LinearRgb } from './color';
import { BlobShape } from './shapes';
import { shapeUniforms } from './blob-field';
import { GlowEngine, GlowSurfaceInputs, GlowTarget } from './glow-engine';
import { LIQUID_STEPS, LenziLiquidBlobGlass, LiquidProfile, liquidProfile } from './liquid-profile';

/** What a blob is made of: a lamp (the glowing blobs), glass, or something solid. */
export type BlobMaterial = 'lamp' | 'glass' | 'solid';
export const BLOB_MATERIALS: readonly BlobMaterial[] = ['lamp', 'glass', 'solid'];

/** One object of the fields: a blob, or a boid that is a blob (a circle). CSS px. */
export interface MaterialObject {
  x: number;
  y: number;
  radius: number;
  /** How softly it joins the others of its material, px. */
  merge: number;
  rotation: number;
  from: BlobShape;
  to: BlobShape;
  /** 0: all `from`; 1: all `to`. */
  mix: number;
  material: BlobMaterial;
  /** Its colour as a lamp (linear). */
  tint: LinearRgb;
  /**
   * A drop instead of its shape (lenzi, 2026-11-14: "i blob boidi fai che siano gocce pure loro"): a round
   * head `radius` wide ahead, narrowing to a small round tail behind, pointing along `rotation` (radians, the
   * way it flies). Its middle is `x`, `y`.
   */
  drop?: boolean;
  /**
   * Its level (lenzi, 2026-11-14: "same material blobs on different z index shouldnt fuse"): it melts only into
   * the objects of its material on its own level; a higher level is drawn over a lower one. 0 when not said.
   */
  layer?: number;
  /** Glass and solid: its own colour (linear); none: the look's (`glass`, `solid`). A lamp's colour is its `tint`. */
  colour?: LinearRgb;
  /**
   * Glass: how much its colour colours what is seen through it, 0 to 1 ("glass should have a tint parameter"); none:
   * half with a colour of its own, none in the page's glass colour.
   */
  tintAmount?: number;
  /**
   * Glass: how much of what is behind it shows through, 0 (its colour only) to 1 (2026-11-15: "glass color should
   * also have transparency setting"); none: 0.7 with a colour of its own, the page's glass otherwise.
   */
  clarity?: number;
  /**
   * Glass that shines too (lenzi, 2026-11-15: "it should be solid/glass and emitting/not emitting"): its light is
   * drawn as a lamp's, in its colour, and the glass over it. (A solid thing that shines is a lamp.)
   */
  emit?: boolean;
}

/** Whether an object sheds light: a lamp, or glass that shines. */
export const shines = (object: MaterialObject): boolean => object.material === 'lamp' || (object.material === 'glass' && object.emit === true);

/**
 * Which levels (by their place, the lowest first) can be in a shadow: a level with something solid on it or on a level
 * above it. A solid thing shades its own level and the ones under it, never one above it (lenzi, 2026-11-20: glass over
 * a solid thing was half in its shadow, "found this other bug"). One a channel of the shadow texture, four at most.
 */
export function shadowCasts(solidOnLevel: readonly boolean[]): [number, number, number, number] {
  const casts: [number, number, number, number] = [0, 0, 0, 0];
  let above = false;
  for (let level = MAX_MATERIAL_LAYERS - 1; level >= 0; level--) {
    above = above || solidOnLevel[level] === true;
    casts[level] = above ? 1 : 0;
  }
  return casts;
}

/**
 * Light of the scene that is not a material object's (a fleet of boids), on a level: added over the lamps of its
 * level and of the levels under it; a lamp of a level above covers it.
 */
export interface LevelLight {
  layer: number;
  /** Adds it into the scene (blending on, ONE ONE). */
  draw(): void;
}

/** The most levels kept apart: a scene's objects on more are drawn with the highest of these. */
export const MAX_MATERIAL_LAYERS = 4;

/** A drop's head, its tail and their places along it, in its radii (as the boids' drops: `flock-scene.ts`). */
export const DROP = { head: 0.8, tail: -1.6, tailRadius: 0.35, length: 2.2 } as const;

/** How the materials look. Colours linear. */
export interface MaterialLook {
  /** How much light a lamp is (as the blob background's), and how soft its edge, CSS px. */
  level: number;
  soft: number;
  /** Glass: its own colour, how much of it (the page's `--lenzi-lit-glass`), the light on its face and on its edge. */
  glass: LinearRgb;
  glassAmount: number;
  veil: number;
  rim: number;
  /** The line along a glass or solid edge, and its width, CSS px. */
  border: LinearRgb;
  borderWidth: number;
  /** Solid: its colour. */
  solid: LinearRgb;
  /**
   * Glass that bends what is behind it, as `lenziLiquidGlass` does, instead of frosting it (lenzi, 2026-11-19:
   * "un'altra scelta nel kit"): clear, no border, a curved bezel along its edge, its shape as it changes. None: frosted.
   */
  liquid?: LenziLiquidBlobGlass | null;
}

/** The most objects the fields hold, the most lamps and solid things the shadow looks at. */
export const MAX_MATERIAL_OBJECTS = 512;
/**
 * How much more light a lamp (a solid thing that shines) sheds than the look's `level`, which glass that shines keeps
 * (lenzi, 2026-11-17: "fai in modo che gli oggetti solidi ed emittenti ... siano piú luminosi"): its glow, and the
 * light it sheds on what is round it.
 */
export const LAMP_SHINE = 2.6;
/**
 * How much light a lamp's body shows as, at `brightness` 1: its own colour, all but full (about 95% of it, a little
 * more towards its middle), as a light that is on (lenzi, 2026-11-17: "sono ancora colorate troppo scure ... devono
 * essere piú vibrant, cosí sono proprio spente"). Its body only: the light it sheds stays `LAMP_SHINE`'s. A lamp's light
 * alone, through the picture's curve (more light, more of its colour, never white), left it at about 70%.
 */
export const LAMP_BODY = 3.5;
const MAX_LAMPS = 16;
/** A solid thing in the light: how much of its colour shows with no light on it, and how fast light brightens it. */
const SOLID_FLOOR = 0.06;
/** Glass's own colour with no light on it: a little more than a solid thing's (light goes into it). */
const GLASS_FLOOR = 0.14;
const SOLID_LIGHT = 1.6;
/** How fast the light on a solid face fades from its edges in: a power of how much is outside round about. */
const SOLID_DEPTH = 1.5;
/**
 * A solid face's light: the light outside the solid things (their edge read softly, from this much of the field, out,
 * up to 1, in), at a quarter of the canvas, blurred by halving it this many times more and back.
 */
const FACE_SOFT = 0.5;
const FACE_HALVINGS = 4;

/** How many places the way to a lamp is looked at, for a shadow. */
const SHADOW_STEPS = 40;
/** A shadow's edge: the field from this (a little outside a solid thing) up to its edge (1) stops part of the light. */
const SHADOW_SOFT = 0.45;
/**
 * Only more of the solid field than at the place itself stops its light, and all of it once the way goes this many
 * times more of it (e^0.8: 0.8 of a merge deeper, the same width as SHADOW_SOFT up to the edge). So a place on a solid
 * thing is shaded on its far side as the place beside it is, and not on its lit side: no line along its edge (it was
 * cut there, unshaded on it and shaded beside it, a quarter of the canvas wide: a staircase along a solid thing hidden
 * under glass, lenzi 2026-11-20, "found this other bug").
 */
const SHADOW_DEEPER = 2.2255;
/** How far to either side of a lamp's middle its shadow ways go, a share of its radius. */
const SHADOW_SPREAD = 0.6;
/** How much of the widest glow reaches a glass or solid surface from all around, and glass's frost (linear). */
const AMBIENT = 4;
const FROST = 0.012;
/**
 * Liquid glass: how saturated what is seen through it is (1: as it is; the directive's 1.5), at most: only as much as
 * a colour takes without a channel going past white or black (cut there, a lamp's light through a drop ended in a
 * line, lenzi 2026-11-20 "sembra che siano tagliati sopra"; and a glass star turned half blue). How much of the veil
 * it keeps, and how much it is seen through, unless a blob says (its own colour, the page's glass).
 */
const LIQUID_SATURATION = 1.4;
const LIQUID_VEIL = 0.25;
/**
 * Liquid glass: where its curved bezel ends. At its width, or nearer where the glass's middle is (a drop, a lobe, any
 * part thinner than two bezels: there the edge's normal turns round) or where its field stops growing (deep inside:
 * flat, no normal). The bending comes down to nothing there; it stopped at once instead, along a line (lenzi,
 * 2026-11-20: the blob-boids "sembra che siano tagliati sopra"). Found walking in along the edge's normal, this many
 * steps over the bezel, then halving the last step this many times.
 */
const LIQUID_MARCH = { steps: 6, halvings: 3 } as const;
const LIQUID_CLARITY = { own: 0.85, page: 0.94 } as const;
/** How far an object's share reaches, in its merges: beyond, e^-9 of it. */
const REACH = 9;
const FLOATS = 28;

const FIELD_VERTEX = `#version 300 es
layout(location = 0) in vec4 place;   // x, y, radius, merge (CSS px)
layout(location = 1) in vec4 turn;    // rotation, mix, material (0 lamp, 1 glass, 2 solid), drop (1)
layout(location = 2) in vec4 superA;  // m, n1, n2, reach
layout(location = 3) in vec4 lobesA;  // lobes, depth, sharp
layout(location = 4) in vec4 superB;
layout(location = 5) in vec4 lobesB;
layout(location = 6) in vec4 tint;
uniform vec2 space;
out vec2 offset;
flat out vec4 vPlace;
flat out vec4 vTurn;
flat out vec4 vSuperA;
flat out vec4 vLobesA;
flat out vec4 vSuperB;
flat out vec4 vLobesB;
flat out vec4 vTint;
void main() {
  vec2 corner = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1)) * 2.0 - 1.0;
  // a drop is longer than it is wide
  offset = corner * (place.z * (turn.w > 0.5 ? ${DROP.length.toFixed(2)} : 1.0) + place.w * ${REACH.toFixed(1)});
  vec2 clip = (place.xy + offset) / space * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  vPlace = place;
  vTurn = turn;
  vSuperA = superA;
  vLobesA = lobesA;
  vSuperB = superB;
  vLobesB = lobesB;
  vTint = tint;
}`;

const FIELD_FRAGMENT = `#version 300 es
precision highp float;
in vec2 offset;
flat in vec4 vPlace;
flat in vec4 vTurn;
flat in vec4 vSuperA;
flat in vec4 vLobesA;
flat in vec4 vSuperB;
flat in vec4 vLobesB;
flat in vec4 vTint;     // a lamp's colour; glass's colour and how much of it; solid's colour
layout(location = 0) out vec4 weights;  // glass, solid, the glass that shines, the lamps
layout(location = 1) out vec4 colours;  // the lamps' colours by share (a little brighter towards its middle), their shares
layout(location = 2) out vec4 glassTint;  // glass: its colour by share and amount, and its amount by share
layout(location = 3) out vec4 solidTint;  // solid: its colour by share, and its share

// shapes.ts's shapeRadius: the superformula's rounded polygon times the scallop of the lobes
float shapeRadius(vec4 s, vec3 l, float angle) {
  float radius = 1.0;
  if (s.x > 0.0) {
    float t = s.x * angle / 4.0;
    radius = pow(pow(abs(cos(t)), s.z) + pow(abs(sin(t)), s.z), -1.0 / s.y) / s.w;
  }
  if (l.x > 0.0 && l.y > 0.0) radius *= 1.0 - l.y * pow(0.5 - 0.5 * cos(l.x * angle), l.z);
  return radius;
}

// a circle of radius r1 at the origin and one of r2 at (0, h), joined by the lines tangent to both (Inigo
// Quilez's uneven capsule, as the boids' drops): below 0 inside
float unevenCapsule(vec2 p, float r1, float r2, float h) {
  p.x = abs(p.x);
  float b = (r1 - r2) / h;
  float a = sqrt(1.0 - b * b);
  float k = dot(p, vec2(-b, a));
  if (k < 0.0) return length(p) - r1;
  if (k > a * h) return length(p - vec2(0.0, h)) - r2;
  return dot(p, vec2(a, b)) - r1;
}

void main() {
  float far = length(offset);
  // how far inside its edge, px
  float edge;
  if (vTurn.w > 0.5) {
    // a drop: into its own frame, ahead along x; its head, then its tail behind
    float c = cos(vTurn.x);
    float s = sin(vTurn.x);
    vec2 q = vec2(c * offset.x + s * offset.y, -s * offset.x + c * offset.y);
    float r = vPlace.z;
    float head = ${DROP.head.toFixed(2)} * r;
    edge = -unevenCapsule(vec2(q.y, head - q.x), r, ${DROP.tailRadius.toFixed(2)} * r, head - ${DROP.tail.toFixed(2)} * r);
  } else {
    float angle = atan(offset.y, offset.x) + vTurn.x;
    edge = mix(shapeRadius(vSuperA, vLobesA.xyz, angle), shapeRadius(vSuperB, vLobesB.xyz, angle), vTurn.y) * vPlace.z - far;
  }
  // its share: e^(how far inside its edge, in merges); 1 on its edge. Kept under e^8: half floats add them up
  float inside = min(edge / max(vPlace.w, 0.5), 8.0);
  if (inside < -${REACH.toFixed(1)}) discard;
  float w = exp(inside);
  // a colour's share reaches farther than an edge's (a quarter as steep): it fades to nothing before the reach, where
  // the object is no longer drawn. Cut there at a tenth, it drew a line across a lamp of another colour nearby
  // (lenzi, 2026-11-15: "solid on solid on the same level", a violet lamp cut in two beside a lavender one)
  float colourFade = smoothstep(-${REACH.toFixed(1)}, -${(REACH * 0.45).toFixed(2)}, inside);
  if (vTurn.z < 0.5) {
    // the colours join more slowly than the edges: two lamps that met are one shape before one colour
    float share = exp(inside / 4.0) * colourFade;
    float depth = clamp(edge / vPlace.z, 0.0, 1.0);
    // the lamps' own field: their light, and what they cover of the levels under them (a lamp is solid)
    weights = vec4(0.0, 0.0, 0.0, w);
    colours = vec4(vTint.rgb * share * (0.8 + 0.2 * depth), share);
    glassTint = vec4(0.0);
    solidTint = vec4(0.0);
  } else if (vTurn.z < 1.5) {
    // glass: where two meet, their colours and amounts by how much of each is there. Glass that shines sheds light
    // under itself, in its colour, of its own shape: how much of the glass here shines is kept apart from the lamps'
    // field, so its light never melts into a lamp's (lenzi, 2026-11-15: "solid and glass interacting": a lamp and
    // shining glass of one level were one shape of light, with a neck between them)
    float shining = vLobesA.w;
    weights = vec4(w, 0.0, w * shining, 0.0);
    colours = vec4(0.0);
    // its colour, how much that colours what is seen through it (its tint), and how much is seen through it (its
    // clarity, kept in solid's free channel), each by how much of it is there: where two meet, as much of each
    glassTint = vec4(vTint.rgb * w, vTint.a * w);
    solidTint = vec4(0.0, 0.0, 0.0, vLobesB.w * w);
  } else {
    weights = vec4(0.0, w, 0.0, 0.0);
    colours = vec4(0.0);
    glassTint = vec4(0.0);
    solidTint = vec4(vTint.rgb * w, 0.0);
  }
}`;

// a level's weights here and one device px to each side: a field's slope is read from them, not from a derivative.
// Where the levels are walked in a loop a derivative is not to be trusted (on some GPUs it is nothing): every solid
// and glass edge was a staircase, with no border and no lit rim (lenzi, 2026-11-15, "something is buggy")
const FIELD_NEAR = `
uniform vec2 pixel;   // one device px, uv
struct Near { vec4 here; vec4 east; vec4 west; vec4 north; vec4 south; };
Near nearAt(highp sampler2DArray fields, float layer) {
  return Near(
    texture(fields, vec3(uv, layer)),
    texture(fields, vec3(uv + vec2(pixel.x, 0.0), layer)), texture(fields, vec3(uv - vec2(pixel.x, 0.0), layer)),
    texture(fields, vec3(uv + vec2(0.0, pixel.y), layer)), texture(fields, vec3(uv - vec2(0.0, pixel.y), layer)));
}
// a field as an edge: 0 where it is 1 (its edge), below 0 inside
float edgeAt(float weight) { return -log(max(weight, 1e-6)); }
// that edge's slope, per device px
vec2 slopeOf(float east, float west, float north, float south) {
  return 0.5 * vec2(edgeAt(east) - edgeAt(west), edgeAt(north) - edgeAt(south));
}
// how much of the place a field fills: where it is 1 is its edge, soft over this many device px
float fillOf(float weight, vec2 slope, float soft) {
  float aa = max(abs(slope.x) + abs(slope.y), 1e-4) * soft;
  return weight > 1e-5 ? smoothstep(aa, -aa, edgeAt(weight)) : 0.0;
}
// how much of the place a level's lamps cover (the solid things that shine, not the glass that does): what is under
// them, on the levels below, does not show
float lampCover(Near n, float soft) {
  return fillOf(n.here.a, slopeOf(n.east.a, n.west.a, n.north.a, n.south.a), soft);
}`;

// the light of one level, added into the scene; or (covering) only what its lamps cover, drawn to take away the
// light under them: a lamp is solid, the boids and the lamps of the levels below do not show through it (lenzi,
// 2026-11-15: "under solid blobs you can see the boids still")
const LAMPS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 uv;
uniform sampler2DArray weights;
uniform sampler2DArray colours;
uniform sampler2DArray glassTints;
uniform float layer;
uniform float level;
uniform float soft;   // device px over the edge
uniform float covering;
out vec4 color;
${FIELD_NEAR}
void main() {
  Near n = nearAt(weights, layer);
  float lamps = lampCover(n, soft);
  if (covering > 0.5) {
    color = vec4(0.0, 0.0, 0.0, lamps);
    return;
  }
  // the lamps: their own shape, their own colours
  vec4 c = texture(colours, vec3(uv, layer));
  vec3 light = c.rgb / max(c.a, 1e-5) * lamps * level * ${LAMP_SHINE.toFixed(2)};
  // the glass that shines: the glass's shape (melted only into the glass of its level), as much as of it shines, in
  // the glass's colour; a lamp of its level is in front of that light, not added to it
  float glass = n.here.r;
  float shining = fillOf(glass, slopeOf(n.east.r, n.west.r, n.north.r, n.south.r), soft) * clamp(n.here.b / max(glass, 1e-6), 0.0, 1.0);
  vec3 glow = texture(glassTints, vec3(uv, layer)).rgb / max(glass, 1e-6) * shining * level * 0.9;
  color = vec4(light + glow * (1.0 - lamps), 1.0 - (1.0 - lamps) * (1.0 - shining));
}`;

// what the solid and the glass surfaces share: the light that reaches them, and how a solid thing looks in it
const SURFACE_LIGHT = `
${FIELD_NEAR}
uniform sampler2D light;
uniform sampler2D ambient;
uniform vec2 ambientTexel;
uniform float lightGain;
uniform vec2 lightStep;   // how far apart the light is sampled for its direction, uv
uniform float veil;
uniform float rim;
uniform vec3 border;
uniform float borderPx;   // device px
uniform sampler2D shadow; // the share of the lamps' light the solid things stop, at every place, on each level (r g b a)
uniform float shaded;     // how much of it a shadow takes (0: no shadows)
uniform sampler2D faceLight; // the light outside the solid things, blurred into them (a: how much is outside)
uniform float lampSoft;   // how soft a lamp's edge is, device px
vec3 decode(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
// light as the picture shows it: its own colour, more of it where there is more, never white
vec3 shine(vec3 l) {
  float most = max(l.r, max(l.g, l.b));
  return l / max(most, 1e-4) * (1.0 - exp(-most));
}
// the wide light is a small picture: read softly, from a ring round the place, so its pixels never show
vec3 wide(vec2 at) {
  vec2 r = ambientTexel * 1.5;
  vec3 sum = texture(ambient, at).rgb * 2.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982;
    sum += texture(ambient, at + vec2(cos(a), sin(a)) * r).rgb;
  }
  return sum / 10.0;
}
float luminance(vec2 at) { return dot(texture(ambient, at).rgb, vec3(0.2126, 0.7152, 0.0722)); }

// the light at this place, before any shadow: from all around (wide, so a lamp under a solid thing does not show
// through it), here (with the glow right there), and the way it comes from (towards more light)
struct Light { vec3 around; vec3 here; vec2 way; };
Light lightHere() {
  vec3 around = wide(uv) * ${AMBIENT.toFixed(1)} * lightGain;
  vec3 here = texture(light, uv).rgb * lightGain + around;
  vec2 towards = vec2(luminance(uv + vec2(lightStep.x, 0.0)) - luminance(uv - vec2(lightStep.x, 0.0)),
                      luminance(uv + vec2(0.0, lightStep.y)) - luminance(uv - vec2(0.0, lightStep.y)));
  return Light(around, here, length(towards) > 1e-6 ? normalize(towards) : vec2(0.0));
}
// that light on a level: less of both in the shadow of the solid things of that level and of the levels above it. A
// solid thing never shades a level above it (lenzi, 2026-11-20: glass over a solid thing was half in its shadow, cut
// along the hidden solid's edge: "found this other bug", "di questo problema")
Light lightOn(Light l, vec4 shadows, int layer) {
  float lit = 1.0 - shaded * clamp(shadows[layer], 0.0, 1.0);
  return Light(l.around * lit, l.here * lit, l.way);
}

// a field's edge here: how much of the place it fills, how far inside it is (device px), and its slope
struct Edge { float fill; float inside; vec2 slope; };
Edge edgeOf(float weight, vec2 slope) {
  float edge = edgeAt(weight);
  float inside = -edge / max(length(slope), 1e-5);
  return Edge(weight > 1e-5 ? clamp(inside + 0.5, 0.0, 1.0) : 0.0, inside, slope);
}

// the light on a solid thing's face: the light outside the solid things, blurred into them (FACE, then halved and
// back): what is beyond its edge, all round it, the less the farther in. A lamp beside it lights it; one under it does
// not (lenzi, 2026-11-15: a solid over a lamp showed the lamp's shape through itself, "solid non emitting objects (the
// one on top) lets light get through still"); one in another's shadow is dark ("the shadows too"). A blur, not ways
// walked out: nothing jumps, no line is drawn across the face
vec3 lightOnFace() {
  vec4 f = texture(faceLight, uv);
  // the light round about (the outside's, averaged), as much as there is outside round about
  return f.rgb / max(f.a, 0.02) * pow(clamp(f.a * 2.0, 0.0, 1.0), ${SOLID_DEPTH.toFixed(2)});
}

// a solid thing: a surface the light falls on (lenzi, 2026-11-15: "they should be like a surface getting
// iluminated not just a thing"), dark where little light reaches it, in the colour of the light that does; its edge lit
// on the side the light comes from. Opaque, always: nothing under it shows on its face.
vec3 solidLook(vec3 albedo, Edge e, Light l) {
  vec3 received = 1.0 - exp(-lightOnFace() * ${SOLID_LIGHT.toFixed(2)});
  vec3 s = albedo * (${SOLID_FLOOR.toFixed(3)} + received);
  vec2 out_ = length(e.slope) > 1e-6 ? normalize(e.slope) : vec2(0.0);
  float facing = max(0.0, dot(out_, l.way));
  float band = clamp(borderPx - e.inside + 0.5, 0.0, 1.0);
  return s + shine(l.here * (0.35 + 0.65 * facing)) * rim * band;
}`;

// the solid things into the picture, before glass blurs it (lenzi, 2026-11-15: "A solid blob won't interact with a
// glass one even on the same z-index", "a non emitting solid blob doesn't work under glass emitting blobs"): every
// level's, the lowest first; glass then shows them through itself, and a higher level's are drawn again over it
const SOLIDS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 uv;
uniform sampler2D picture;
uniform int layers;
uniform sampler2DArray weights;
uniform sampler2DArray solidTints;
uniform sampler2DArray colours;   // the lamps' colours by share (a little brighter towards their middle), their shares
uniform float lampLight;          // how much light a lamp is, as the light pass adds it (the look's level × LAMP_SHINE)
uniform float core;               // the picture's gain on the objects themselves
out vec4 color;
${SURFACE_LIGHT}
// a lamp's body as a light that is on: its own colour, all but full (lenzi, 2026-11-17: "devono essere piú vibrant, cosí
// sono proprio spente"). The picture shows a lamp as its light, which is also its glow and the light it sheds round it:
// what its body lacks of that is added here, to its body only, over what the picture made of its light (so what flies
// over it still shows)
vec3 lampLift(float layer) {
  vec4 k = texture(colours, vec3(uv, layer));
  if (k.a <= 1e-5) return vec3(0.0);
  vec3 own = k.rgb / k.a;
  return max(shine(own * ${LAMP_BODY.toFixed(2)} * core) - shine(own * lampLight * core), vec3(0.0));
}
void main() {
  // the picture: where a lamp is, the lamp as it is drawn, with what flies over it
  vec3 shown = decode(texture(picture, uv).rgb);
  vec3 c = shown;
  Light l = lightHere();
  vec4 shadows = texture(shadow, uv);
  for (int i = 0; i < ${MAX_MATERIAL_LAYERS}; i++) {
    if (i >= layers) break;
    float layer = float(i);
    Near n = nearAt(weights, layer);
    vec4 w = n.here;
    // a level's lamps cover the solid things of the levels under it: the picture again there, the lamp's body lit up
    float cover = lampCover(n, lampSoft);
    if (cover > 0.0) c = mix(c, shown + lampLift(layer), cover);
    Edge solid = edgeOf(w.g, slopeOf(n.east.g, n.west.g, n.north.g, n.south.g));
    vec3 albedo = texture(solidTints, vec3(uv, layer)).rgb / max(w.g, 1e-6);
    if (solid.fill > 0.0) c = mix(c, solidLook(albedo, solid, lightOn(l, shadows, i)), solid.fill);
  }
  color = vec4(encode(c), 1.0);
}`;

const SURFACES = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 uv;
uniform sampler2D picture;
uniform sampler2D blurred;
// each level's fields, a layer each, the lowest first: the weights, glass's colour and tint, solid's colour (and
// glass's clarity)
uniform int layers;
uniform sampler2DArray weights;
uniform sampler2DArray glassTints;
uniform sampler2DArray solidTints;
// liquid glass (1) or frosted (0); its bezel and largest shift, device px; the shift over the bezel, from the edge in
uniform float liquid;
uniform float bezelPx;
uniform float liftPx;
uniform float profile[${LIQUID_STEPS + 1}];
out vec4 color;
${SURFACE_LIGHT}

// how far what is seen at a place inside the bezel comes from, inwards, device px (as lenziLiquidGlass bends), over
// a bezel that ends \`reach\` in: a narrower one is the same lens, smaller (its bending as much smaller)
float bendAt(float inside, float reach) {
  if (inside <= 0.0 || inside >= reach) return 0.0;
  float at = inside / reach * ${LIQUID_STEPS.toFixed(1)};
  int i = min(int(at), ${LIQUID_STEPS - 1});
  return mix(profile[i], profile[i + 1], at - float(i)) * liftPx * reach / bezelPx;
}

// a colour more saturated, by \`amount\` at most: as much as it takes with every channel still between black and white,
// so its hue is kept and nothing is cut (a cut channel drew a line where it began)
vec3 saturated(vec3 c, float amount) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 away = c - l;
  float most = amount;
  for (int i = 0; i < 3; i++) {
    if (away[i] > 1e-5) most = min(most, (1.0 - l) / away[i]);
    else if (away[i] < -1e-5) most = min(most, l / -away[i]);
  }
  return l + away * max(1.0, most);
}

// the glass's edge normal at another place of its level
vec2 glassNormalAt(float layer, vec2 at) {
  vec2 slope = 0.5 * vec2(
    edgeAt(texture(weights, vec3(at + vec2(pixel.x, 0.0), layer)).r) - edgeAt(texture(weights, vec3(at - vec2(pixel.x, 0.0), layer)).r),
    edgeAt(texture(weights, vec3(at + vec2(0.0, pixel.y), layer)).r) - edgeAt(texture(weights, vec3(at - vec2(0.0, pixel.y), layer)).r));
  return length(slope) > 1e-6 ? normalize(slope) : vec2(0.0);
}

// whether the edge's normal this far further in (device px) is still this one: not past the glass's middle (where it
// turns round), not deep inside (where the field is flat and has none)
bool sameWay(float layer, vec2 out_, float further) {
  return dot(out_, glassNormalAt(layer, uv - out_ * further * pixel)) > 0.5;
}

// how far in from the edge the curved bezel goes along this normal: its width, or less where the glass's middle or
// its flat inside is nearer (walked to in steps, the last one halved: the bezel's end moves smoothly, no line)
float bezelHere(float layer, vec2 out_, float inside) {
  float room = bezelPx - inside;
  float step = bezelPx / ${LIQUID_MARCH.steps.toFixed(1)};
  float near = 0.0;
  float far = -1.0;
  for (int i = 1; i <= ${LIQUID_MARCH.steps}; i++) {
    float further = min(step * float(i), room);
    if (!sameWay(layer, out_, further)) {
      far = further;
      break;
    }
    near = further;
    if (further >= room) break;
  }
  if (far < 0.0) return bezelPx;
  for (int i = 0; i < ${LIQUID_MARCH.halvings}; i++) {
    float middle = 0.5 * (near + far);
    if (sameWay(layer, out_, middle)) near = middle;
    else far = middle;
  }
  return inside + 0.5 * (near + far);
}

// one level over the picture so far: its solid things (in the picture already, drawn again over a lower level's
// glass), then its glass over them
vec3 level(vec3 c, float layer, Near n, Light l) {
  vec4 w = n.here;
  Edge glass = edgeOf(w.r, slopeOf(n.east.r, n.west.r, n.north.r, n.south.r));
  Edge solid = edgeOf(w.g, slopeOf(n.east.g, n.west.g, n.north.g, n.south.g));
  vec4 solidTint = texture(solidTints, vec3(uv, layer));
  if (solid.fill > 0.0) c = mix(c, solidLook(solidTint.rgb / max(w.g, 1e-6), solid, l), solid.fill);
  if (glass.fill > 0.0) {
    // its colour, how much that colours what is seen through it (lenzi, 2026-11-15: "the tint on the glass ... doesn't
    // mix properly with the things under it"), how much is seen through it ("glass color should also have transparency")
    vec4 t = texture(glassTints, vec3(uv, layer));
    float share = max(w.r, 1e-6);
    vec3 colour = t.rgb / share;
    float tint = clamp(t.a / share, 0.0, 1.0);
    float clarity = clamp(solidTint.a / share, 0.0, 1.0);
    vec2 out_ = length(glass.slope) > 1e-6 ? normalize(glass.slope) : vec2(0.0);
    // what is behind it: blurred (frosted); or bent near its edge, from inwards, and clear (liquid: the field's slope is
    // the edge's normal and its depth the distance from it, at every frame, whatever its shape)
    vec3 behind;
    if (liquid > 0.5) {
      float bend = 0.0;
      if (glass.inside > 0.0 && glass.inside < bezelPx && length(out_) > 0.0) bend = bendAt(glass.inside, bezelHere(layer, out_, glass.inside));
      behind = decode(texture(picture, uv - out_ * bend * pixel).rgb);
      behind = saturated(clamp(behind, 0.0, 1.0), ${LIQUID_SATURATION.toFixed(2)});
    } else {
      behind = decode(texture(blurred, uv).rgb);
    }
    // through its colour as a filter (its hue, not its darkness)
    float most = max(colour.r, max(colour.g, colour.b));
    vec3 through = behind * mix(vec3(1.0), colour / max(most, 1e-4), tint);
    // its own body lit as a surface is (frosted glass takes the light round it): dark where it is dark, so it sits in
    // the scene instead of on it
    vec3 body = colour * (${GLASS_FLOOR.toFixed(3)} + (1.0 - exp(-l.around * ${SOLID_LIGHT.toFixed(2)})));
    vec3 g = mix(body, through, clarity) + ${FROST.toFixed(3)} * (1.0 - liquid);
    g += shine(l.around) * veil * mix(1.0, ${LIQUID_VEIL.toFixed(2)}, liquid);
    // its edge: a line, lit on the side that faces the light (liquid: no line, only the light on it)
    float facing = max(0.0, dot(out_, l.way));
    float band = clamp(borderPx - glass.inside + 0.5, 0.0, 1.0);
    g = mix(g, border, band * 0.8 * (1.0 - liquid));
    g += shine(l.here * (0.35 + 0.65 * facing)) * rim * band;
    c = mix(c, g, glass.fill);
  }
  return c;
}

void main() {
  // the picture: where a lamp is, the lamp as it is drawn (the light of the levels under it taken away, the solid
  // things under it not drawn), with what flies over it
  vec3 shown = decode(texture(picture, uv).rgb);
  vec3 c = shown;
  Light l = lightHere();
  vec4 shadows = texture(shadow, uv);
  // the levels, the lowest first, each over the ones under it, never melted into them (lenzi, 2026-11-15: "the order
  // in which they render ... should also be depended on the z index"): its lamps over the glass of the levels under
  // it (the picture again there: all of it, so no line is left along the glass's edge; "under solid blobs you can see
  // the boids still (only the outline for the blob boids)"), then its solid and glass things, in its own light
  for (int i = 0; i < ${MAX_MATERIAL_LAYERS}; i++) {
    if (i >= layers) break;
    float layer = float(i);
    Near n = nearAt(weights, layer);
    c = mix(c, shown, lampCover(n, lampSoft));
    c = level(c, layer, n, lightOn(l, shadows, i));
  }
  color = vec4(encode(c), 1.0);
}`;
// the shadow follows the solid things' own shapes (melted where they meet): the way from a place to each lamp
// is walked through the solid field, and a lamp whose way crosses it lights that place no more. One shadow a level
// (red, green, blue, alpha: the levels from the lowest): a solid thing shades its own level and the ones under it,
// never one above it (glass over it is not in its shadow). Red is also the picture's: every solid thing's
const SHADOW = `#version 300 es
precision highp float;
uniform highp sampler2DArray field;    // each level's fields, a layer each: green is the solid one
uniform int layers;
uniform int lampCount;
uniform vec4 lamps[${MAX_LAMPS}];      // x, y, radius, strength (CSS px)
uniform vec4 casts;                    // 1 for a level that has solid things on it or above it
uniform vec2 space;                    // CSS px
uniform float height;                  // of the target, px
uniform float scale;                   // target px in a CSS px
out vec4 color;
vec2 at(vec2 css) { return vec2(css.x / space.x, 1.0 - css.y / space.y); }
// the solid field at a place, for each level: the most of its own and of the levels above it
vec4 solidsAt(vec2 uv) {
  vec4 s = vec4(0.0);
  float above = 0.0;
  for (int i = ${MAX_MATERIAL_LAYERS - 1}; i >= 0; i--) {
    if (i < layers) above = max(above, texture(field, vec3(uv, float(i))).g);
    s[i] = above;
  }
  return s;
}
// how much of the way from p to a place the solid things stop, for each level: their edge read softly (the field from
// a little outside to inside), so a step that lands near an edge stops part of it and a thin thing never flickers.
// Only more of the field than at p counts (from), all of it once the way goes SHADOW_DEEPER times more (full): no dark
// ring round a solid thing on its lit side, and on it, shaded on its far side as beside it. Levels with nothing to
// stop them start stopped (done), so the walk ends as soon as every other one is
vec4 stopped(vec2 p, vec2 to, vec4 from, vec4 full, vec4 done) {
  vec4 most = done;
  for (int s = 1; s <= ${SHADOW_STEPS}; s++) {
    most = max(most, smoothstep(from, full, solidsAt(at(mix(p, to, float(s) / ${SHADOW_STEPS.toFixed(1)})))));
    if (all(greaterThanEqual(most, vec4(1.0)))) break;
  }
  return most;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, height - gl_FragCoord.y) / scale;
  vec4 own = solidsAt(at(p));
  vec4 from = max(vec4(${SHADOW_SOFT.toFixed(2)}), own);
  vec4 full = max(vec4(1.0), own * ${SHADOW_DEEPER.toFixed(4)});
  vec4 done = 1.0 - casts;
  float total = 0.0;
  vec4 blocked = vec4(0.0);
  for (int i = 0; i < ${MAX_LAMPS}; i++) {
    if (i >= lampCount) break;
    vec4 lamp = lamps[i];
    vec2 way = lamp.xy - p;
    float far = length(way);
    // a lamp's light here: as bright as it is large, fading with the distance
    float here = lamp.w * lamp.z * lamp.z / (far * far + lamp.z * lamp.z);
    total += here;
    if (far <= lamp.z) continue;
    // a lamp is wide, not a point: the ways to either side of it, each up to its edge. Where one is stopped and the
    // other not, half its light is missing: the shadow's soft edge, the wider the farther from what casts it
    vec2 across = vec2(-way.y, way.x) / far * lamp.z * ${SHADOW_SPREAD.toFixed(2)};
    float reach = 1.0 - lamp.z / far;
    vec4 left = stopped(p, p + (way + across) * reach, from, full, done);
    vec4 right = stopped(p, p + (way - across) * reach, from, full, done);
    blocked += here * 0.5 * (left + right);
  }
  color = total > 1e-5 ? blocked / total * casts : vec4(0.0);
}`;

// the light outside the solid things, for their faces to take (blurred into them next): the glow and the wide light,
// less what a shadow takes, as much as the place is out of every solid thing; alpha: how much it is out
const FACE = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 uv;
uniform sampler2D light;
uniform sampler2D ambient;
uniform sampler2D shadow;
uniform float shaded;
uniform float lightGain;
uniform int layers;
uniform sampler2DArray weights;
out vec4 color;
void main() {
  float solid = 0.0;
  for (int i = 0; i < ${MAX_MATERIAL_LAYERS}; i++) {
    if (i >= layers) break;
    solid = max(solid, texture(weights, vec3(uv, float(i))).g);
  }
  float out_ = 1.0 - smoothstep(${FACE_SOFT.toFixed(2)}, 1.0, solid);
  vec3 l = (texture(light, uv).rgb * 0.5 + texture(ambient, uv).rgb * ${AMBIENT.toFixed(1)}) * lightGain;
  l *= 1.0 - shaded * clamp(texture(shadow, uv).r, 0.0, 1.0);
  color = vec4(l * out_, out_);
}`;

// Dual Kawase, as the glow's: a wide, smooth blur for a few samples at every halving
const FACE_DOWN = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D source;
uniform vec2 halfTexel;
out vec4 color;
void main() {
  vec2 o = halfTexel;
  color = (texture(source, uv) * 4.0 + texture(source, uv - o) + texture(source, uv + o)
    + texture(source, uv + vec2(o.x, -o.y)) + texture(source, uv - vec2(o.x, -o.y))) / 8.0;
}`;

const FACE_UP = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D source;
uniform vec2 halfTexel;
out vec4 color;
void main() {
  vec2 o = halfTexel;
  vec4 sum = texture(source, uv + vec2(-o.x * 2.0, 0.0)) + texture(source, uv + vec2(o.x * 2.0, 0.0))
    + texture(source, uv + vec2(0.0, o.y * 2.0)) + texture(source, uv + vec2(0.0, -o.y * 2.0))
    + (texture(source, uv + vec2(-o.x, o.y)) + texture(source, uv + vec2(o.x, o.y))
    + texture(source, uv + vec2(o.x, -o.y)) + texture(source, uv + vec2(-o.x, -o.y))) * 2.0;
  color = sum / 12.0;
}`;

export class MaterialScene {
  private readonly field: WebGLProgram;
  private readonly lamps: WebGLProgram;
  private readonly surfaces: WebGLProgram;
  private readonly solidPass: WebGLProgram;
  private readonly shadow: WebGLProgram;
  private readonly vertexArray: WebGLVertexArrayObject;
  private readonly buffer: WebGLBuffer;
  private data = new Float32Array(0);
  private objects: readonly MaterialObject[] = [];
  /** The objects by level, the lowest first: each level its own fields (they never melt into another's). */
  private levels: MaterialObject[][] = [[]];
  /** Each of those levels' own number (a scene's `layer`): where the light of other things falls among them. */
  private layers: number[] = [0];
  private look: MaterialLook | null = null;
  /** The liquid glass's profile, and the look it was made for. */
  private profile: LiquidProfile | null = null;
  private profileKey = '';
  /** Each level's fields, a layer of one texture each: the weights, the lamps' colours, glass's, solid's. */
  private fields: LayeredFields | null = null;
  private shadowTarget: GlowTarget | null = null;
  /** The light outside the solid things, a quarter of the canvas, then halved again and again (and back up). */
  private faceTargets: GlowTarget[] = [];
  private readonly face: WebGLProgram;
  private readonly faceDown: WebGLProgram;
  private readonly faceUp: WebGLProgram;
  /** This frame's light on the solid faces, or null (not drawn yet, or nothing solid). */
  private faced: WebGLTexture | null = null;
  private has = { lamp: false, glass: false, solid: false };
  /** Whether some lamp (a solid thing that shines, not glass) is there: its body is lit up in the solids pass. */
  private bodies = false;
  private shadowed = false;

  constructor(private readonly engine: GlowEngine) {
    // the fields add shares beyond 1: half floats, or nothing to draw them with
    if (!engine.hasFloat) throw new Error('No half-float targets: the blob materials need them');
    const gl = engine.gl;
    this.field = engine.program(FIELD_FRAGMENT, FIELD_VERTEX);
    this.lamps = engine.program(LAMPS);
    this.surfaces = engine.program(SURFACES);
    this.solidPass = engine.program(SOLIDS);
    this.shadow = engine.program(SHADOW);
    this.face = engine.program(FACE);
    this.faceDown = engine.program(FACE_DOWN);
    this.faceUp = engine.program(FACE_UP);
    this.vertexArray = gl.createVertexArray()!;
    this.buffer = gl.createBuffer()!;
    gl.bindVertexArray(this.vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    for (let location = 0; location < FLOATS / 4; location++) {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 4, gl.FLOAT, false, FLOATS * 4, location * 16);
      gl.vertexAttribDivisor(location, 1);
    }
    gl.bindVertexArray(null);
  }

  /** What to draw this frame, and how it looks. */
  set(objects: readonly MaterialObject[], look: MaterialLook): void {
    this.objects = objects.slice(0, MAX_MATERIAL_OBJECTS);
    this.look = look;
    this.has = { lamp: false, glass: false, solid: false };
    this.bodies = this.objects.some((object) => object.material === 'lamp');
    for (const object of this.objects) {
      this.has[object.material] = true;
      if (shines(object)) this.has.lamp = true;
    }
    // the levels there are, the lowest first; past the most kept apart, the highest of them
    const found = [...new Set(this.objects.map((object) => object.layer ?? 0))].sort((a, b) => a - b);
    const slotOf = new Map(found.map((layer, i) => [layer, Math.min(i, MAX_MATERIAL_LAYERS - 1)]));
    this.levels = Array.from({ length: Math.max(1, Math.min(found.length, MAX_MATERIAL_LAYERS)) }, () => [] as MaterialObject[]);
    this.layers = found.length > 0 ? found.slice(0, MAX_MATERIAL_LAYERS) : [0];
    for (const object of this.objects) this.levels[slotOf.get(object.layer ?? 0) ?? 0]!.push(object);
  }

  /** Before the light: each level's fields, and the shadow (lamps and solid things both there). */
  prepare(): void {
    const engine = this.engine;
    const gl = engine.gl;
    const look = this.look;
    this.fit();
    this.faced = null;
    gl.useProgram(this.field);
    gl.uniform2f(engine.uniform(this.field, 'space'), engine.cssWidth, engine.cssHeight);
    const fields = this.fields!;
    this.levels.forEach((objects, slot) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fields.framebuffers[slot]!);
      gl.viewport(0, 0, fields.width, fields.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const count = objects.length;
      if (count === 0) return;
      if (this.data.length < count * FLOATS) this.data = new Float32Array(Math.max(count, 64) * FLOATS);
      const data = this.data;
      objects.forEach((object, i) => {
        const a = shapeUniforms(object.from);
        const b = shapeUniforms(object.to);
        const at = i * FLOATS;
        // a lamp's colour; glass's own (one that shines, its light's; else the page's glass) with its tint, and its
        // clarity below; solid's own, or its tint (2026-11-15: "solid shouldn't be trasparent": in the page's own colour
        // it looked a hole)
        const ownGlass = object.material === 'glass' && (object.colour !== undefined || object.emit === true);
        const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
        const tint =
          object.material === 'lamp'
            ? [...object.tint, 0]
            : object.material === 'glass'
              ? [...(object.colour ?? (object.emit ? object.tint : (look?.glass ?? object.tint))), clamp01(object.tintAmount ?? (ownGlass ? 0.5 : 0))]
              : [...(object.colour ?? object.tint), 1];
        const clarity = clamp01(
          object.clarity ?? (look?.liquid ? (ownGlass ? LIQUID_CLARITY.own : LIQUID_CLARITY.page) : ownGlass ? 0.7 : 1 - (look?.glassAmount ?? 0.5)),
        );
        data.set([object.x, object.y, Math.max(0.5, object.radius), Math.max(0.5, object.merge)], at);
        data.set([object.rotation, object.mix, BLOB_MATERIALS.indexOf(object.material), object.drop ? 1 : 0], at + 4);
        // the free place after the first shape's lobes: whether glass shines
        data.set([a[0], a[1], a[2], a[3], a[4], a[5], a[6], object.material === 'glass' && object.emit ? 1 : 0], at + 8);
        // the free place after the second shape's lobes: glass's clarity
        data.set([b[0], b[1], b[2], b[3], b[4], b[5], b[6], object.material === 'glass' ? clarity : 0], at + 16);
        data.set(tint, at + 24);
      });
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(this.field);
      gl.bindVertexArray(this.vertexArray);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, count * FLOATS), gl.DYNAMIC_DRAW);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
      gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
    });
    this.shadowed = this.has.lamp && this.has.solid && this.drawShadow();
  }

  /**
   * The scene's light, the lowest level first: each level's lamps, then the other light on that level (`others`:
   * the boids), added. A lamp is solid: before its own light is added, the light of the levels under it is taken
   * away where it is (lenzi, 2026-11-15: "under solid blobs you can see the boids still"); glass that shines only
   * adds its light. The light of one level adds up, as ever.
   */
  drawLight(others: readonly LevelLight[] = []): void {
    const engine = this.engine;
    const gl = engine.gl;
    const look = this.look;
    const fields = this.fields;
    const waiting = [...others].sort((a, b) => a.layer - b.layer);
    let next = 0;
    // whether there is light under the level being drawn
    let under = false;
    const addBelow = (layer: number) => {
      for (; next < waiting.length && waiting[next]!.layer < layer; next++) {
        gl.blendFunc(gl.ONE, gl.ONE);
        waiting[next]!.draw();
        under = true;
      }
    };
    if (this.has.lamp && look && fields) {
      const program = this.lamps;
      this.levels.forEach((objects, slot) => {
        if (!objects.some(shines)) return;
        addBelow(this.layers[slot] ?? 0);
        gl.useProgram(program);
        gl.uniform1f(engine.uniform(program, 'level'), look.level);
        gl.uniform1f(engine.uniform(program, 'soft'), Math.max(0.75, look.soft * engine.scale));
        gl.uniform2f(engine.uniform(program, 'pixel'), 1 / Math.max(1, engine.pixelWidth), 1 / Math.max(1, engine.pixelHeight));
        this.useLayers(program, 'weights', fields.weights, 0);
        this.useLayers(program, 'colours', fields.colours, 1);
        this.useLayers(program, 'glassTints', fields.glass, 2);
        gl.uniform1f(engine.uniform(program, 'layer'), slot);
        if (under && objects.some((object) => object.material === 'lamp')) {
          gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
          gl.uniform1f(engine.uniform(program, 'covering'), 1);
          engine.fullscreen();
        }
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.uniform1f(engine.uniform(program, 'covering'), 0);
        engine.fullscreen();
        under = true;
      });
    }
    addBelow(Infinity);
    gl.blendFunc(gl.ONE, gl.ONE);
  }

  /** The share of the glow stopped at every place, or null (nothing solid, or no lamp). */
  shadowTexture(): WebGLTexture | null {
    return this.shadowed && this.shadowTarget ? this.shadowTarget.texture : null;
  }

  /**
   * The solid things into the finished picture, before glass blurs it: lit by the light round them, every level's; and
   * the lamps' bodies lit up to their own colour (so glass shows them so too). False when there are neither.
   */
  drawSolids(inputs: GlowSurfaceInputs): boolean {
    const look = this.look;
    const fields = this.fields;
    if ((!this.has.solid && !this.bodies) || !look || !fields) return false;
    const engine = this.engine;
    const gl = engine.gl;
    // the light on the solid faces: only when there is something solid
    if (this.has.solid) this.drawFace(inputs, fields);
    const program = this.solidPass;
    gl.useProgram(program);
    engine.useTexture(program, 'picture', inputs.picture, 0);
    engine.useTexture(program, 'light', inputs.light, 1);
    engine.useTexture(program, 'ambient', inputs.ambient, 2);
    this.useLayers(program, 'weights', fields.weights, 3);
    this.useLayers(program, 'solidTints', fields.solid, 4);
    gl.uniform1i(engine.uniform(program, 'layers'), this.levels.length);
    this.lightUniforms(program, inputs, look, 5);
    // the lamps' colours, and how the light pass and the picture made their light: what their bodies lack is added
    this.useLayers(program, 'colours', fields.colours, 7);
    gl.uniform1f(engine.uniform(program, 'lampLight'), look.level * LAMP_SHINE);
    gl.uniform1f(engine.uniform(program, 'core'), inputs.core);
    engine.fullscreen();
    return true;
  }

  /**
   * The light on the solid faces: the light outside them (shadows taken), blurred into them. Drawn into its own
   * targets; the target the engine was drawing into is drawn into again after.
   */
  private drawFace(inputs: GlowSurfaceInputs, fields: LayeredFields): void {
    const engine = this.engine;
    const gl = engine.gl;
    const [first, ...rest] = this.faceTargets;
    if (!first) return;
    const framebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
    const viewport = gl.getParameter(gl.VIEWPORT) as Int32Array;
    engine.into(first);
    gl.useProgram(this.face);
    engine.useTexture(this.face, 'light', inputs.light, 0);
    engine.useTexture(this.face, 'ambient', inputs.ambient, 1);
    const shadow = this.shadowTexture();
    engine.useTexture(this.face, 'shadow', shadow ?? inputs.ambient, 2);
    gl.uniform1f(engine.uniform(this.face, 'shaded'), shadow ? 1 : 0);
    gl.uniform1f(engine.uniform(this.face, 'lightGain'), inputs.lightGain);
    this.useLayers(this.face, 'weights', fields.weights, 3);
    gl.uniform1i(engine.uniform(this.face, 'layers'), this.levels.length);
    engine.fullscreen();
    // down, halving, then back up to the second (an eighth of the canvas): stretched smoothly where it is read
    let source = first;
    for (const target of rest) {
      engine.into(target);
      gl.useProgram(this.faceDown);
      engine.useTexture(this.faceDown, 'source', source.texture, 0);
      gl.uniform2f(engine.uniform(this.faceDown, 'halfTexel'), 0.5 / source.width, 0.5 / source.height);
      engine.fullscreen();
      source = target;
    }
    for (let level = rest.length - 1; level > 0; level--) {
      const target = rest[level - 1]!;
      engine.into(target);
      gl.useProgram(this.faceUp);
      engine.useTexture(this.faceUp, 'source', source.texture, 0);
      gl.uniform2f(engine.uniform(this.faceUp, 'halfTexel'), 0.5 / source.width, 0.5 / source.height);
      engine.fullscreen();
      source = target;
    }
    this.faced = source.texture;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(viewport[0]!, viewport[1]!, viewport[2]!, viewport[3]!);
  }

  /** What the solid and the glass passes share: how the light reaches a surface, and the look of its edge. */
  private lightUniforms(program: WebGLProgram, inputs: GlowSurfaceInputs, look: MaterialLook, shadowUnit: number): void {
    const engine = this.engine;
    const gl = engine.gl;
    // the shadows the solid things cast fall on the surfaces too (no shadow: any texture, taking nothing)
    const shadow = this.shadowTexture();
    engine.useTexture(program, 'shadow', shadow ?? inputs.ambient, shadowUnit);
    gl.uniform1f(engine.uniform(program, 'shaded'), shadow ? 1 : 0);
    // the light on the solid faces (drawn by the solids pass; none yet: any texture, nothing solid reads it)
    engine.useTexture(program, 'faceLight', this.faced ?? inputs.ambient, shadowUnit + 1);
    gl.uniform2f(engine.uniform(program, 'ambientTexel'), 1 / inputs.ambientSize[0], 1 / inputs.ambientSize[1]);
    gl.uniform1f(engine.uniform(program, 'lightGain'), inputs.lightGain);
    // the light's direction is read 80 px apart: the side a light is on, not its grain
    gl.uniform2f(engine.uniform(program, 'lightStep'), 80 / engine.cssWidth, 80 / engine.cssHeight);
    gl.uniform1f(engine.uniform(program, 'veil'), look.veil);
    gl.uniform1f(engine.uniform(program, 'rim'), look.rim);
    gl.uniform3f(engine.uniform(program, 'border'), ...look.border);
    gl.uniform1f(engine.uniform(program, 'borderPx'), look.borderWidth * engine.scale);
    gl.uniform2f(engine.uniform(program, 'pixel'), 1 / Math.max(1, engine.pixelWidth), 1 / Math.max(1, engine.pixelHeight));
    // a lamp's edge, as the light pass draws it: what it covers of the levels under it
    gl.uniform1f(engine.uniform(program, 'lampSoft'), Math.max(0.75, look.soft * engine.scale));
  }

  /** The glass and the solid things over the finished picture; false when there are none. */
  drawSurfaces(inputs: GlowSurfaceInputs): boolean {
    const look = this.look;
    const fields = this.fields;
    // nothing to draw over the picture: no glass, nothing solid (a lamp over a lamp is the light pass's)
    if ((!this.has.glass && !this.has.solid) || !look || !fields) return false;
    const engine = this.engine;
    const gl = engine.gl;
    const program = this.surfaces;
    gl.useProgram(program);
    engine.useTexture(program, 'picture', inputs.picture, 0);
    engine.useTexture(program, 'blurred', inputs.blurred, 1);
    engine.useTexture(program, 'light', inputs.light, 2);
    engine.useTexture(program, 'ambient', inputs.ambient, 3);
    // each level's fields
    this.useLayers(program, 'weights', fields.weights, 4);
    this.useLayers(program, 'glassTints', fields.glass, 5);
    this.useLayers(program, 'solidTints', fields.solid, 6);
    gl.uniform1i(engine.uniform(program, 'layers'), this.levels.length);
    this.lightUniforms(program, inputs, look, 7);
    this.liquidUniforms(program, look);
    engine.fullscreen();
    return true;
  }

  /** The liquid glass's bending (its profile made again only when the look changes it), or frosted glass. */
  private liquidUniforms(program: WebGLProgram, look: MaterialLook): void {
    const engine = this.engine;
    const gl = engine.gl;
    const liquid = look.liquid ?? null;
    gl.uniform1f(engine.uniform(program, 'liquid'), liquid ? 1 : 0);
    if (!liquid) return;
    const key = `${liquid.bezel}|${liquid.thickness}|${liquid.ior}|${liquid.refraction}`;
    if (key !== this.profileKey || !this.profile) {
      this.profileKey = key;
      this.profile = liquidProfile(liquid);
    }
    gl.uniform1f(engine.uniform(program, 'bezelPx'), Math.max(1, liquid.bezel) * engine.scale);
    gl.uniform1f(engine.uniform(program, 'liftPx'), this.profile.largest * engine.scale);
    gl.uniform1fv(engine.uniform(program, 'profile'), this.profile.shifts);
  }

  dispose(): void {
    const gl = this.engine.gl;
    this.freeFields();
    this.engine.freeTarget(this.shadowTarget);
    this.shadowTarget = null;
    for (const target of this.faceTargets) this.engine.freeTarget(target);
    this.faceTargets = [];
    gl.deleteBuffer(this.buffer);
    gl.deleteVertexArray(this.vertexArray);
  }

  /** The targets as large as the canvas wants: each level's fields half its size, the shadow a quarter. */
  private fit(): void {
    const engine = this.engine;
    const width = Math.max(2, engine.pixelWidth >> 1);
    const height = Math.max(2, engine.pixelHeight >> 1);
    // the fields: the weights, the lamps' colours, glass's colour and amount, solid's colour; a layer a level
    if (!this.fields || this.fields.width !== width || this.fields.height !== height) {
      this.freeFields();
      this.fields = this.makeFields(width, height);
    }
    const shadowWidth = Math.max(2, engine.pixelWidth >> 2);
    const shadowHeight = Math.max(2, engine.pixelHeight >> 2);
    if (!this.shadowTarget || this.shadowTarget.width !== shadowWidth || this.shadowTarget.height !== shadowHeight) {
      engine.freeTarget(this.shadowTarget);
      this.shadowTarget = engine.makeTarget(shadowWidth, shadowHeight, false);
    }
    // the light on the solid faces: a quarter of the canvas, then halved again and again (half floats: light past 1)
    const face = this.faceTargets[0];
    if (!face || face.width !== shadowWidth || face.height !== shadowHeight) {
      for (const target of this.faceTargets) engine.freeTarget(target);
      this.faceTargets = [];
      for (let level = 0; level <= FACE_HALVINGS; level++) {
        const w = shadowWidth >> level;
        const h = shadowHeight >> level;
        if (w < 2 || h < 2) break;
        this.faceTargets.push(engine.makeTarget(w, h, true));
      }
    }
  }

  /** The shadow: for every place, the share of the lamps' light that a solid thing stops on its way. */
  private drawShadow(): boolean {
    const engine = this.engine;
    const gl = engine.gl;
    const target = this.shadowTarget;
    if (!target) return false;
    // the largest lamps: the ones whose shadows show
    const lamps = this.objects
      .filter(shines)
      .sort((a, b) => b.radius - a.radius)
      .slice(0, MAX_LAMPS);
    if (lamps.length === 0 || !this.fields) return false;
    const lampData = new Float32Array(MAX_LAMPS * 4);
    lamps.forEach((lamp, i) => lampData.set([lamp.x, lamp.y, Math.max(1, lamp.radius), 1], i * 4));
    engine.into(target);
    gl.disable(gl.BLEND);
    gl.useProgram(this.shadow);
    this.useLayers(this.shadow, 'field', this.fields.weights, 0);
    gl.uniform1i(engine.uniform(this.shadow, 'layers'), this.levels.length);
    gl.uniform1i(engine.uniform(this.shadow, 'lampCount'), lamps.length);
    gl.uniform4fv(engine.uniform(this.shadow, 'lamps'), lampData);
    gl.uniform4fv(engine.uniform(this.shadow, 'casts'), shadowCasts(this.levels.map((objects) => objects.some((object) => object.material === 'solid'))));
    gl.uniform2f(engine.uniform(this.shadow, 'space'), engine.cssWidth, engine.cssHeight);
    gl.uniform1f(engine.uniform(this.shadow, 'height'), target.height);
    gl.uniform1f(engine.uniform(this.shadow, 'scale'), target.width / engine.cssWidth);
    engine.fullscreen();
    return true;
  }

  /** The fields' textures, a layer a level, and a framebuffer for each level drawing into its layer of all four. */
  private makeFields(width: number, height: number): LayeredFields {
    const gl = this.engine.gl;
    const layered = () => {
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
      gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA16F, width, height, MAX_MATERIAL_LAYERS, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    };
    const textures = [layered(), layered(), layered(), layered()];
    const framebuffers = Array.from({ length: MAX_MATERIAL_LAYERS }, (_, layer) => {
      const framebuffer = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      textures.forEach((texture, i) => gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, texture, 0, layer));
      gl.drawBuffers(textures.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
      return framebuffer;
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
    return { width, height, weights: textures[0]!, colours: textures[1]!, glass: textures[2]!, solid: textures[3]!, framebuffers };
  }

  private freeFields(): void {
    const fields = this.fields;
    if (!fields) return;
    const gl = this.engine.gl;
    for (const framebuffer of fields.framebuffers) gl.deleteFramebuffer(framebuffer);
    for (const texture of [fields.weights, fields.colours, fields.glass, fields.solid]) gl.deleteTexture(texture);
    this.fields = null;
  }

  /** A layered texture for a sampler of a program, on a texture unit. */
  private useLayers(program: WebGLProgram, name: string, texture: WebGLTexture, unit: number): void {
    const gl = this.engine.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.uniform1i(this.engine.uniform(program, name), unit);
  }
}

/** The fields of every level: four textures of a layer a level, a framebuffer a level. */
interface LayeredFields {
  width: number;
  height: number;
  weights: WebGLTexture;
  colours: WebGLTexture;
  glass: WebGLTexture;
  solid: WebGLTexture;
  framebuffers: WebGLFramebuffer[];
}

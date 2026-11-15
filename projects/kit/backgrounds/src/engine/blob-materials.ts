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
}

/** The most objects the fields hold, the most lamps and solid things the shadow looks at. */
export const MAX_MATERIAL_OBJECTS = 512;
const MAX_LAMPS = 16;
/** A solid thing in the light: how much of its colour shows with no light on it, and how fast light brightens it. */
const SOLID_FLOOR = 0.06;
/** Glass's own colour with no light on it: a little more than a solid thing's (light goes into it). */
const GLASS_FLOOR = 0.14;
const SOLID_LIGHT = 1.6;
/** How fast the light reaching a solid face fades from its edges in, per screen width. */
const SOLID_DEPTH = 9;
/** A solid face looks for its edge this many ways round, from this far (device px), doubling this many times. */
const FACE_WAYS = 8;
const FACE_FIRST = 4;
const FACE_STEPS = 9;

/** How many places the way to a lamp is looked at, for a shadow. */
const SHADOW_STEPS = 48;
/** How much of the widest glow reaches a glass or solid surface from all around, and glass's frost (linear). */
const AMBIENT = 4;
const FROST = 0.012;
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
layout(location = 0) out vec4 weights;  // glass, solid, lamp, lamp's colour shares
layout(location = 1) out vec4 colours;  // the lamps' colours by share, and their depth by share
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
  if (vTurn.z < 0.5) {
    // the colours join more slowly than the edges: two lamps that met are one shape before one colour
    float share = exp(inside / 4.0);
    float depth = clamp(edge / vPlace.z, 0.0, 1.0);
    weights = vec4(0.0, 0.0, w, share);
    colours = vec4(vTint.rgb * share, share * depth);
    glassTint = vec4(0.0);
    solidTint = vec4(0.0);
  } else if (vTurn.z < 1.5) {
    // glass: where two meet, their colours and amounts by how much of each is there; glass that shines is a
    // lamp too, in its colour, under itself
    float shining = vLobesA.w;
    float share = exp(inside / 4.0) * shining;
    weights = vec4(w, 0.0, w * shining, share);
    colours = vec4(vTint.rgb * share, share * clamp(edge / vPlace.z, 0.0, 1.0));
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

// a lamp's light at a place of one level's fields (the fields are layers of one texture each, a layer a level)
const LAMP_LIGHT = `
vec4 lampLight(highp sampler2DArray weights, highp sampler2DArray colours, float layer, float level, float soft) {
  vec4 w = texture(weights, vec3(uv, layer));
  // where the lamps' field is 1 is their edge; below 0 inside
  float edge = -log(max(w.z, 1e-6));
  float aa = max(fwidth(edge), 1e-4) * soft;
  float fill = w.z > 1e-5 ? smoothstep(aa, -aa, edge) : 0.0;
  vec4 c = texture(colours, vec3(uv, layer));
  float shares = max(w.w, 1e-5);
  // a little more light towards the middle of a lamp
  return vec4(c.rgb / shares * fill * level * (0.8 + 0.2 * c.a / shares), fill);
}`;

const LAMPS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 uv;
uniform sampler2DArray weights;
uniform sampler2DArray colours;
uniform float layer;
uniform float level;
uniform float soft;   // device px over the edge
out vec4 color;
${LAMP_LIGHT}
void main() {
  color = lampLight(weights, colours, layer, level, soft);
}`;

// what the solid and the glass surfaces share: the light that reaches them, and how a solid thing looks in it
const SURFACE_LIGHT = `
uniform sampler2D light;
uniform sampler2D ambient;
uniform vec2 ambientTexel;
uniform float lightGain;
uniform vec2 lightStep;   // how far apart the light is sampled for its direction, uv
uniform float veil;
uniform float rim;
uniform vec3 border;
uniform float borderPx;   // device px
uniform vec2 pixel;       // one device px, uv
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

// the light at this place: from all around (wide, so a lamp under a solid thing does not show through it), here
// (with the glow right there), and the way it comes from (towards more light)
struct Light { vec3 around; vec3 here; vec2 way; };
Light lightHere() {
  vec3 around = wide(uv) * ${AMBIENT.toFixed(1)} * lightGain;
  vec3 here = texture(light, uv).rgb * lightGain + around;
  vec2 towards = vec2(luminance(uv + vec2(lightStep.x, 0.0)) - luminance(uv - vec2(lightStep.x, 0.0)),
                      luminance(uv + vec2(0.0, lightStep.y)) - luminance(uv - vec2(0.0, lightStep.y)));
  return Light(around, here, length(towards) > 1e-6 ? normalize(towards) : vec2(0.0));
}

// a field's edge here: how much of the place it fills, how far inside it is (device px), and its slope
struct Edge { float fill; float inside; vec2 slope; };
Edge edgeOf(float weight) {
  float edge = -log(max(weight, 1e-6));
  vec2 slope = vec2(dFdx(edge), dFdy(edge));
  float inside = -edge / max(length(slope), 1e-5);
  return Edge(weight > 1e-5 ? clamp(inside + 0.5, 0.0, 1.0) : 0.0, inside, slope);
}

// how far a solid thing of this level reaches from here along a way (device px): doubling until out of it, then
// halving back to its edge, the last bit read off the field (its edge is where the field is 1)
float edgeAlong(vec2 way, float layer) {
  float inner = 0.0;
  float outer = ${FACE_FIRST.toFixed(1)};
  for (int s = 0; s < ${FACE_STEPS}; s++) {
    if (texture(weights, vec3(uv + way * outer, layer)).g < 1.0) break;
    inner = outer;
    outer *= 2.0;
  }
  for (int s = 0; s < 3; s++) {
    float middle = 0.5 * (inner + outer);
    if (texture(weights, vec3(uv + way * middle, layer)).g < 1.0) outer = middle;
    else inner = middle;
  }
  float a = -log(max(texture(weights, vec3(uv + way * inner, layer)).g, 1e-6));
  float b = -log(max(texture(weights, vec3(uv + way * outer, layer)).g, 1e-6));
  return mix(inner, outer, clamp(a / min(a - b, -1e-6), 0.0, 1.0));
}

// the light on a solid thing's face: what is beyond its edge, all round it, the less the farther that edge is. A lamp
// beside it lights it; one under it does not (lenzi, 2026-11-15: a solid over a lamp showed the lamp's shape through
// itself, "solid non emitting objects (the one on top) lets light get through still")
vec3 lightOnto(float layer) {
  vec3 sum = vec3(0.0);
  for (int d = 0; d < ${FACE_WAYS}; d++) {
    float a = (float(d) + 0.5) * ${((2 * Math.PI) / FACE_WAYS).toFixed(6)};
    vec2 way = vec2(cos(a), sin(a)) * pixel;
    vec2 across = vec2(-way.y * pixel.x / pixel.y, way.x * pixel.y / pixel.x);
    float far = edgeAlong(way, layer);
    // read softly, the wider the farther: a sharp shadow out there never draws a line across the face
    float spread = far * 0.6 + 14.0;
    vec2 at = uv + way * (far + spread * 0.5);
    vec3 there = texture(ambient, at).rgb * 2.0 + texture(ambient, at + across * spread).rgb + texture(ambient, at - across * spread).rgb
      + texture(ambient, at + way * spread).rgb;
    sum += there / 5.0 * exp(-far * pixel.x * ${SOLID_DEPTH.toFixed(1)});
  }
  return sum / ${FACE_WAYS.toFixed(1)} * ${AMBIENT.toFixed(1)} * lightGain;
}

// a solid thing: a surface the light falls on (lenzi, 2026-11-15: "they should be like a surface getting
// iluminated not just a thing"), dark where little light reaches it, in the colour of the light that does; its edge lit
// on the side the light comes from. Opaque, always: nothing under it shows on its face.
vec3 solidLook(vec3 albedo, Edge e, Light l, float layer) {
  vec3 received = 1.0 - exp(-lightOnto(layer) * ${SOLID_LIGHT.toFixed(2)});
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
out vec4 color;
${SURFACE_LIGHT}
void main() {
  vec3 c = decode(texture(picture, uv).rgb);
  Light l = lightHere();
  for (int i = 0; i < ${MAX_MATERIAL_LAYERS}; i++) {
    if (i >= layers) break;
    float layer = float(i);
    vec4 w = texture(weights, vec3(uv, layer));
    Edge solid = edgeOf(w.g);
    vec3 albedo = texture(solidTints, vec3(uv, layer)).rgb / max(w.g, 1e-6);
    if (solid.fill > 0.0) c = mix(c, solidLook(albedo, solid, l, layer), solid.fill);
  }
  color = vec4(encode(c), 1.0);
}`;

const SURFACES = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 uv;
uniform sampler2D picture;
uniform sampler2D blurred;
// each level's fields, a layer each, the lowest first: the weights, the lamps' colours, glass's colour and tint,
// solid's colour (and glass's clarity)
uniform int layers;
uniform sampler2DArray weights;
uniform sampler2DArray lampColours;
uniform sampler2DArray glassTints;
uniform sampler2DArray solidTints;
// a lamp as the picture shows it (the composite's): its light, how bright, how soft its edge
uniform float lampLevel;
uniform float lampSoft;
uniform float core;
uniform vec3 base;
out vec4 color;
${SURFACE_LIGHT}
${LAMP_LIGHT}

// a lamp as the picture shows it (the composite's way, on the base): drawn over what a lower level covered, it is
// itself there, not its light added onto a solid thing's colour
vec3 lampLook(vec4 lamp) {
  vec3 l = lamp.rgb * core;
  float most = max(l.r, max(l.g, l.b));
  vec3 own = l / max(most, 1e-4);
  return base + (1.0 - base) * own * (1.0 - exp(-most));
}

// one level over the picture so far: its solid things (in the picture already, drawn again over a lower level's
// glass), then its glass over them; how much of the place they cover, added up
vec3 level(vec3 c, inout float cover, float layer, Light l) {
  vec4 w = texture(weights, vec3(uv, layer));
  Edge glass = edgeOf(w.r);
  Edge solid = edgeOf(w.g);
  vec4 solidTint = texture(solidTints, vec3(uv, layer));
  if (solid.fill > 0.0) c = mix(c, solidLook(solidTint.rgb / max(w.g, 1e-6), solid, l, layer), solid.fill);
  if (glass.fill > 0.0) {
    // its colour, how much that colours what is seen through it (lenzi, 2026-11-15: "the tint on the glass ... doesn't
    // mix properly with the things under it"), how much is seen through it ("glass color should also have transparency")
    vec4 t = texture(glassTints, vec3(uv, layer));
    float share = max(w.r, 1e-6);
    vec3 colour = t.rgb / share;
    float tint = clamp(t.a / share, 0.0, 1.0);
    float clarity = clamp(solidTint.a / share, 0.0, 1.0);
    // what is behind it, blurred, through its colour as a filter (its hue, not its darkness)
    float most = max(colour.r, max(colour.g, colour.b));
    vec3 through = decode(texture(blurred, uv).rgb) * mix(vec3(1.0), colour / max(most, 1e-4), tint);
    // its own body lit as a surface is (frosted glass takes the light round it): dark where it is dark, so it sits in
    // the scene instead of on it
    vec3 body = colour * (${GLASS_FLOOR.toFixed(3)} + (1.0 - exp(-l.around * ${SOLID_LIGHT.toFixed(2)})));
    vec3 g = mix(body, through, clarity) + ${FROST.toFixed(3)};
    g += shine(l.around) * veil;
    // its edge: a line, lit on the side that faces the light
    vec2 out_ = length(glass.slope) > 1e-6 ? normalize(glass.slope) : vec2(0.0);
    float facing = max(0.0, dot(out_, l.way));
    float band = clamp(borderPx - glass.inside + 0.5, 0.0, 1.0);
    g = mix(g, border, band * 0.8);
    g += shine(l.here * (0.35 + 0.65 * facing)) * rim * band;
    c = mix(c, g, glass.fill);
  }
  cover = 1.0 - (1.0 - cover) * (1.0 - max(glass.fill, solid.fill));
  return c;
}

void main() {
  vec3 c = decode(texture(picture, uv).rgb);
  Light l = lightHere();
  // the levels, the lowest first, each over the ones under it, never melted into them (lenzi, 2026-11-15: "the order
  // in which they render ... should also be depended on the z index"): its lamps over what a lower level covered
  // (where nothing covered them they are in the picture already), then its solid and glass things
  float cover = 0.0;
  for (int i = 0; i < ${MAX_MATERIAL_LAYERS}; i++) {
    if (i >= layers) break;
    float layer = float(i);
    vec4 lamp = lampLight(weights, lampColours, layer, lampLevel, lampSoft);
    c = mix(c, lampLook(lamp), cover * lamp.a);
    c = level(c, cover, layer, l);
  }
  color = vec4(encode(c), 1.0);
}`;
// the shadow follows the solid things' own shapes (melted where they meet): the way from a place to each lamp
// is walked through the solid field, and a lamp whose way crosses it lights that place no more
const SHADOW = `#version 300 es
precision highp float;
uniform highp sampler2DArray field;    // each level's fields, a layer each: green is the solid one
uniform int layers;
uniform int lampCount;
uniform vec4 lamps[${MAX_LAMPS}];      // x, y, radius, strength (CSS px)
uniform vec2 space;                    // CSS px
uniform float height;                  // of the target, px
uniform float scale;                   // target px in a CSS px
out vec4 color;
vec2 at(vec2 css) { return vec2(css.x / space.x, 1.0 - css.y / space.y); }
// the solid field at a place: the most of any level's (every solid thing casts its shadow)
float solidAt(vec2 uv) {
  float s = 0.0;
  for (int i = 0; i < ${MAX_MATERIAL_LAYERS}; i++) {
    if (i >= layers) break;
    s = max(s, texture(field, vec3(uv, float(i))).g);
  }
  return s;
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, height - gl_FragCoord.y) / scale;
  // under a solid thing: it covers this place, no shadow of its own
  if (solidAt(at(p)) > 0.5) { color = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float total = 0.0;
  float blocked = 0.0;
  for (int i = 0; i < ${MAX_LAMPS}; i++) {
    if (i >= lampCount) break;
    vec4 lamp = lamps[i];
    vec2 way = lamp.xy - p;
    float far = length(way);
    // a lamp's light here: as bright as it is large, fading with the distance
    float here = lamp.w * lamp.z * lamp.z / (far * far + lamp.z * lamp.z);
    total += here;
    if (far <= lamp.z) continue;
    // from here up to the lamp's edge, in steps a few px long
    float reach = 1.0 - lamp.z / far;
    for (int s = 1; s <= ${SHADOW_STEPS}; s++) {
      float t = reach * float(s) / ${SHADOW_STEPS.toFixed(1)};
      if (solidAt(at(p + way * t)) > 1.0) {
        blocked += here;
        break;
      }
    }
  }
  color = vec4(total > 1e-5 ? blocked / total : 0.0, 0.0, 0.0, 1.0);
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
  private look: MaterialLook | null = null;
  /** Each level's fields, a layer of one texture each: the weights, the lamps' colours, glass's, solid's. */
  private fields: LayeredFields | null = null;
  private shadowTarget: GlowTarget | null = null;
  private has = { lamp: false, glass: false, solid: false };
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
    for (const object of this.objects) {
      this.has[object.material] = true;
      if (shines(object)) this.has.lamp = true;
    }
    // the levels there are, the lowest first; past the most kept apart, the highest of them
    const found = [...new Set(this.objects.map((object) => object.layer ?? 0))].sort((a, b) => a - b);
    const slotOf = new Map(found.map((layer, i) => [layer, Math.min(i, MAX_MATERIAL_LAYERS - 1)]));
    this.levels = Array.from({ length: Math.max(1, Math.min(found.length, MAX_MATERIAL_LAYERS)) }, () => [] as MaterialObject[]);
    for (const object of this.objects) this.levels[slotOf.get(object.layer ?? 0) ?? 0]!.push(object);
  }

  /** Before the light: each level's fields, and the shadow (lamps and solid things both there). */
  prepare(): void {
    const engine = this.engine;
    const gl = engine.gl;
    const look = this.look;
    this.fit();
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
        const clarity = clamp01(object.clarity ?? (ownGlass ? 0.7 : 1 - (look?.glassAmount ?? 0.5)));
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

  /** The lamps' light, added into the scene: each level's lamps, apart. */
  drawLight(): void {
    const look = this.look;
    if (!this.has.lamp || !look) return;
    const engine = this.engine;
    const gl = engine.gl;
    gl.useProgram(this.lamps);
    gl.uniform1f(engine.uniform(this.lamps, 'level'), look.level);
    gl.uniform1f(engine.uniform(this.lamps, 'soft'), Math.max(0.75, look.soft * engine.scale));
    const fields = this.fields;
    if (!fields) return;
    this.useLayers(this.lamps, 'weights', fields.weights, 0);
    this.useLayers(this.lamps, 'colours', fields.colours, 1);
    this.levels.forEach((objects, slot) => {
      if (!objects.some(shines)) return;
      gl.uniform1f(engine.uniform(this.lamps, 'layer'), slot);
      engine.fullscreen();
    });
  }

  /** The share of the glow stopped at every place, or null (nothing solid, or no lamp). */
  shadowTexture(): WebGLTexture | null {
    return this.shadowed && this.shadowTarget ? this.shadowTarget.texture : null;
  }

  /**
   * The solid things into the finished picture, before glass blurs it: lit by the light round them, every level's;
   * false when there are none.
   */
  drawSolids(inputs: GlowSurfaceInputs): boolean {
    const look = this.look;
    const fields = this.fields;
    if (!this.has.solid || !look || !fields) return false;
    const engine = this.engine;
    const gl = engine.gl;
    const program = this.solidPass;
    gl.useProgram(program);
    engine.useTexture(program, 'picture', inputs.picture, 0);
    engine.useTexture(program, 'light', inputs.light, 1);
    engine.useTexture(program, 'ambient', inputs.ambient, 2);
    this.useLayers(program, 'weights', fields.weights, 3);
    this.useLayers(program, 'solidTints', fields.solid, 4);
    gl.uniform1i(engine.uniform(program, 'layers'), this.levels.length);
    this.lightUniforms(program, inputs, look);
    engine.fullscreen();
    return true;
  }

  /** What the solid and the glass passes share: how the light reaches a surface, and the look of its edge. */
  private lightUniforms(program: WebGLProgram, inputs: GlowSurfaceInputs, look: MaterialLook): void {
    const engine = this.engine;
    const gl = engine.gl;
    gl.uniform2f(engine.uniform(program, 'ambientTexel'), 1 / inputs.ambientSize[0], 1 / inputs.ambientSize[1]);
    gl.uniform1f(engine.uniform(program, 'lightGain'), inputs.lightGain);
    // the light's direction is read 80 px apart: the side a light is on, not its grain
    gl.uniform2f(engine.uniform(program, 'lightStep'), 80 / engine.cssWidth, 80 / engine.cssHeight);
    gl.uniform1f(engine.uniform(program, 'veil'), look.veil);
    gl.uniform1f(engine.uniform(program, 'rim'), look.rim);
    gl.uniform3f(engine.uniform(program, 'border'), ...look.border);
    gl.uniform1f(engine.uniform(program, 'borderPx'), look.borderWidth * engine.scale);
    gl.uniform2f(engine.uniform(program, 'pixel'), 1 / Math.max(1, engine.pixelWidth), 1 / Math.max(1, engine.pixelHeight));
  }

  /** The glass and the solid things over the finished picture; false when there are none. */
  drawSurfaces(inputs: GlowSurfaceInputs): boolean {
    const look = this.look;
    const fields = this.fields;
    if ((!this.has.glass && !this.has.solid) || !look || !fields) return false;
    const engine = this.engine;
    const gl = engine.gl;
    const program = this.surfaces;
    gl.useProgram(program);
    engine.useTexture(program, 'picture', inputs.picture, 0);
    engine.useTexture(program, 'blurred', inputs.blurred, 1);
    engine.useTexture(program, 'light', inputs.light, 2);
    engine.useTexture(program, 'ambient', inputs.ambient, 3);
    // each level's fields, and how a lamp of a higher level shows over a lower one
    this.useLayers(program, 'weights', fields.weights, 4);
    this.useLayers(program, 'lampColours', fields.colours, 5);
    this.useLayers(program, 'glassTints', fields.glass, 6);
    this.useLayers(program, 'solidTints', fields.solid, 7);
    gl.uniform1i(engine.uniform(program, 'layers'), this.levels.length);
    gl.uniform1f(engine.uniform(program, 'lampLevel'), look.level);
    gl.uniform1f(engine.uniform(program, 'lampSoft'), Math.max(0.75, look.soft * engine.scale));
    gl.uniform1f(engine.uniform(program, 'core'), inputs.core ?? 1);
    gl.uniform3f(engine.uniform(program, 'base'), ...(inputs.base ?? [0.0144, 0.0144, 0.0159]));
    this.lightUniforms(program, inputs, look);
    engine.fullscreen();
    return true;
  }

  dispose(): void {
    const gl = this.engine.gl;
    this.freeFields();
    this.engine.freeTarget(this.shadowTarget);
    this.shadowTarget = null;
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

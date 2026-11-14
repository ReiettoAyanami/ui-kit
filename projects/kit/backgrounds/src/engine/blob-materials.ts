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
}

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
layout(location = 1) in vec4 turn;    // rotation, mix, material (0 lamp, 1 glass, 2 solid)
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
flat out vec3 vTint;
void main() {
  vec2 corner = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1)) * 2.0 - 1.0;
  offset = corner * (place.z + place.w * ${REACH.toFixed(1)});
  vec2 clip = (place.xy + offset) / space * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  vPlace = place;
  vTurn = turn;
  vSuperA = superA;
  vLobesA = lobesA;
  vSuperB = superB;
  vLobesB = lobesB;
  vTint = tint.rgb;
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
flat in vec3 vTint;
layout(location = 0) out vec4 weights;  // glass, solid, lamp, lamp's colour shares
layout(location = 1) out vec4 colours;  // the lamps' colours by share, and their depth by share

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

void main() {
  float far = length(offset);
  float angle = atan(offset.y, offset.x) + vTurn.x;
  float radius = mix(shapeRadius(vSuperA, vLobesA.xyz, angle), shapeRadius(vSuperB, vLobesB.xyz, angle), vTurn.y) * vPlace.z;
  // its share: e^(how far inside its edge, in merges); 1 on its edge. Kept under e^8: half floats add them up
  float inside = min((radius - far) / max(vPlace.w, 0.5), 8.0);
  if (inside < -${REACH.toFixed(1)}) discard;
  float w = exp(inside);
  if (vTurn.z < 0.5) {
    // the colours join more slowly than the edges: two lamps that met are one shape before one colour
    float share = exp(inside / 4.0);
    float depth = clamp(1.0 - far / vPlace.z, 0.0, 1.0);
    weights = vec4(0.0, 0.0, w, share);
    colours = vec4(vTint * share, share * depth);
  } else if (vTurn.z < 1.5) {
    weights = vec4(w, 0.0, 0.0, 0.0);
    colours = vec4(0.0);
  } else {
    weights = vec4(0.0, w, 0.0, 0.0);
    colours = vec4(0.0);
  }
}`;

const LAMPS = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D weights;
uniform sampler2D colours;
uniform float level;
uniform float soft;   // device px over the edge
out vec4 color;
void main() {
  vec4 w = texture(weights, uv);
  // where the lamps' field is 1 is their edge; below 0 inside
  float edge = -log(max(w.z, 1e-6));
  float aa = max(fwidth(edge), 1e-4) * soft;
  float fill = w.z > 1e-5 ? smoothstep(aa, -aa, edge) : 0.0;
  vec4 c = texture(colours, uv);
  float shares = max(w.w, 1e-5);
  // a little more light towards the middle of a lamp
  color = vec4(c.rgb / shares * fill * level * (0.8 + 0.2 * c.a / shares), fill);
}`;

const SURFACES = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D picture;
uniform sampler2D blurred;
uniform sampler2D light;
uniform sampler2D ambient;
uniform vec2 ambientTexel;
uniform sampler2D weights;
uniform float lightGain;
uniform vec2 lightStep;   // how far apart the light is sampled for its direction, uv
uniform vec3 glass;
uniform float glassAmount;
uniform float veil;
uniform float rim;
uniform vec3 border;
uniform float borderPx;   // device px
uniform vec3 solid;
out vec4 color;
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
void main() {
  vec4 w = texture(weights, uv);
  float glassEdge = -log(max(w.r, 1e-6));
  float solidEdge = -log(max(w.g, 1e-6));
  // how far inside each edge, device px (from the field's slope on the screen)
  vec2 glassSlope = vec2(dFdx(glassEdge), dFdy(glassEdge));
  vec2 solidSlope = vec2(dFdx(solidEdge), dFdy(solidEdge));
  float glassIn = -glassEdge / max(length(glassSlope), 1e-5);
  float solidIn = -solidEdge / max(length(solidSlope), 1e-5);
  float glassFill = w.r > 1e-5 ? clamp(glassIn + 0.5, 0.0, 1.0) : 0.0;
  float solidFill = w.g > 1e-5 ? clamp(solidIn + 0.5, 0.0, 1.0) : 0.0;
  vec3 c = decode(texture(picture, uv).rgb);
  if (glassFill <= 0.0 && solidFill <= 0.0) {
    color = vec4(encode(c), 1.0);
    return;
  }
  // the light: what reaches a face from all around (as the page's lit surfaces take the background's light:
  // wide, so a lamp under a solid thing does not show through it), and on an edge the glow right there too;
  // and where it comes from (towards more light, wide)
  vec3 around = wide(uv) * ${AMBIENT.toFixed(1)} * lightGain;
  vec3 here = texture(light, uv).rgb * lightGain + around;
  vec2 towards = vec2(luminance(uv + vec2(lightStep.x, 0.0)) - luminance(uv - vec2(lightStep.x, 0.0)),
                      luminance(uv + vec2(0.0, lightStep.y)) - luminance(uv - vec2(0.0, lightStep.y)));
  vec2 lightWay = length(towards) > 1e-6 ? normalize(towards) : vec2(0.0);

  if (glassFill > 0.0) {
    vec2 out_ = length(glassSlope) > 1e-6 ? normalize(glassSlope) : vec2(0.0);
    float facing = max(0.0, dot(out_, lightWay));
    float band = clamp(borderPx - glassIn + 0.5, 0.0, 1.0);
    // glass: what is behind it, blurred, under its own colour; the light on its face; its edge lit on the
    // side that faces the light
    vec3 g = mix(decode(texture(blurred, uv).rgb), glass, glassAmount) + ${FROST.toFixed(3)};
    g += shine(around) * veil;
    g = mix(g, border, band * 0.8);
    g += shine(here * (0.35 + 0.65 * facing)) * rim * band;
    c = mix(c, g, glassFill);
  }
  if (solidFill > 0.0) {
    vec2 out_ = length(solidSlope) > 1e-6 ? normalize(solidSlope) : vec2(0.0);
    float facing = max(0.0, dot(out_, lightWay));
    float band = clamp(borderPx - solidIn + 0.5, 0.0, 1.0);
    // solid: its own colour, the light on it as it is here (more on the side towards a light, by itself);
    // the side that faces the light only on its edge (inside, the field is flat and says no side)
    vec3 s = solid + shine(around) * veil * 0.6;
    s = mix(s, border, band * 0.8);
    s += shine(here * (0.35 + 0.65 * facing)) * rim * band;
    c = mix(c, s, solidFill);
  }
  color = vec4(encode(c), 1.0);
}`;

// the shadow follows the solid things' own shapes (melted where they meet): the way from a place to each lamp
// is walked through the solid field, and a lamp whose way crosses it lights that place no more
const SHADOW = `#version 300 es
precision highp float;
uniform sampler2D field;               // the fields: green is the solid one
uniform int lampCount;
uniform vec4 lamps[${MAX_LAMPS}];      // x, y, radius, strength (CSS px)
uniform vec2 space;                    // CSS px
uniform float height;                  // of the target, px
uniform float scale;                   // target px in a CSS px
out vec4 color;
vec2 at(vec2 css) { return vec2(css.x / space.x, 1.0 - css.y / space.y); }
void main() {
  vec2 p = vec2(gl_FragCoord.x, height - gl_FragCoord.y) / scale;
  // under a solid thing: it covers this place, no shadow of its own
  if (texture(field, at(p)).g > 0.5) { color = vec4(0.0, 0.0, 0.0, 1.0); return; }
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
      if (texture(field, at(p + way * t)).g > 1.0) {
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
  private readonly shadow: WebGLProgram;
  private readonly vertexArray: WebGLVertexArrayObject;
  private readonly buffer: WebGLBuffer;
  private data = new Float32Array(0);
  private objects: readonly MaterialObject[] = [];
  private look: MaterialLook | null = null;
  private fieldTarget: GlowTarget | null = null;
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
    for (const object of this.objects) this.has[object.material] = true;
  }

  /** Before the light: the fields, and the shadow (lamps and solid things both there). */
  prepare(): void {
    const engine = this.engine;
    const gl = engine.gl;
    this.fit();
    const target = this.fieldTarget!;
    engine.into(target);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const count = this.objects.length;
    if (count > 0) {
      if (this.data.length < count * FLOATS) this.data = new Float32Array(Math.max(count, 64) * FLOATS);
      const data = this.data;
      this.objects.forEach((object, i) => {
        const a = shapeUniforms(object.from);
        const b = shapeUniforms(object.to);
        const at = i * FLOATS;
        data.set([object.x, object.y, Math.max(0.5, object.radius), Math.max(0.5, object.merge)], at);
        data.set([object.rotation, object.mix, BLOB_MATERIALS.indexOf(object.material), 0], at + 4);
        data.set([a[0], a[1], a[2], a[3], a[4], a[5], a[6], 0], at + 8);
        data.set([b[0], b[1], b[2], b[3], b[4], b[5], b[6], 0], at + 16);
        data.set([object.tint[0], object.tint[1], object.tint[2], 0], at + 24);
      });
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(this.field);
      gl.uniform2f(engine.uniform(this.field, 'space'), engine.cssWidth, engine.cssHeight);
      gl.bindVertexArray(this.vertexArray);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, count * FLOATS), gl.DYNAMIC_DRAW);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
      gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
    }
    this.shadowed = this.has.lamp && this.has.solid && this.drawShadow();
  }

  /** The lamps' light, added into the scene. */
  drawLight(): void {
    const look = this.look;
    if (!this.has.lamp || !look || !this.fieldTarget) return;
    const engine = this.engine;
    const gl = engine.gl;
    gl.useProgram(this.lamps);
    engine.useTexture(this.lamps, 'weights', this.fieldTarget.textures[0]!, 0);
    engine.useTexture(this.lamps, 'colours', this.fieldTarget.textures[1]!, 1);
    gl.uniform1f(engine.uniform(this.lamps, 'level'), look.level);
    gl.uniform1f(engine.uniform(this.lamps, 'soft'), Math.max(0.75, look.soft * engine.scale));
    engine.fullscreen();
  }

  /** The share of the glow stopped at every place, or null (nothing solid, or no lamp). */
  shadowTexture(): WebGLTexture | null {
    return this.shadowed && this.shadowTarget ? this.shadowTarget.texture : null;
  }

  /** The glass and the solid things over the finished picture; false when there are none. */
  drawSurfaces(inputs: GlowSurfaceInputs): boolean {
    const look = this.look;
    if ((!this.has.glass && !this.has.solid) || !look || !this.fieldTarget) return false;
    const engine = this.engine;
    const gl = engine.gl;
    const program = this.surfaces;
    gl.useProgram(program);
    engine.useTexture(program, 'picture', inputs.picture, 0);
    engine.useTexture(program, 'blurred', inputs.blurred, 1);
    engine.useTexture(program, 'light', inputs.light, 2);
    engine.useTexture(program, 'weights', this.fieldTarget.textures[0]!, 3);
    engine.useTexture(program, 'ambient', inputs.ambient, 4);
    gl.uniform2f(engine.uniform(program, 'ambientTexel'), 1 / inputs.ambientSize[0], 1 / inputs.ambientSize[1]);
    gl.uniform1f(engine.uniform(program, 'lightGain'), inputs.lightGain);
    // the light's direction is read 80 px apart: the side a light is on, not its grain
    gl.uniform2f(engine.uniform(program, 'lightStep'), 80 / engine.cssWidth, 80 / engine.cssHeight);
    gl.uniform3f(engine.uniform(program, 'glass'), ...look.glass);
    gl.uniform1f(engine.uniform(program, 'glassAmount'), look.glassAmount);
    gl.uniform1f(engine.uniform(program, 'veil'), look.veil);
    gl.uniform1f(engine.uniform(program, 'rim'), look.rim);
    gl.uniform3f(engine.uniform(program, 'border'), ...look.border);
    gl.uniform1f(engine.uniform(program, 'borderPx'), look.borderWidth * engine.scale);
    gl.uniform3f(engine.uniform(program, 'solid'), ...look.solid);
    engine.fullscreen();
    return true;
  }

  dispose(): void {
    const gl = this.engine.gl;
    this.engine.freeTarget(this.fieldTarget);
    this.engine.freeTarget(this.shadowTarget);
    this.fieldTarget = this.shadowTarget = null;
    gl.deleteBuffer(this.buffer);
    gl.deleteVertexArray(this.vertexArray);
  }

  /** The targets as large as the canvas wants: the fields half its size, the shadow a quarter. */
  private fit(): void {
    const engine = this.engine;
    const width = Math.max(2, engine.pixelWidth >> 1);
    const height = Math.max(2, engine.pixelHeight >> 1);
    if (!this.fieldTarget || this.fieldTarget.width !== width || this.fieldTarget.height !== height) {
      engine.freeTarget(this.fieldTarget);
      this.fieldTarget = engine.makeTarget(width, height, true, 2);
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
      .filter((object) => object.material === 'lamp')
      .sort((a, b) => b.radius - a.radius)
      .slice(0, MAX_LAMPS);
    if (lamps.length === 0 || !this.fieldTarget) return false;
    const lampData = new Float32Array(MAX_LAMPS * 4);
    lamps.forEach((lamp, i) => lampData.set([lamp.x, lamp.y, Math.max(1, lamp.radius), 1], i * 4));
    engine.into(target);
    gl.disable(gl.BLEND);
    gl.useProgram(this.shadow);
    engine.useTexture(this.shadow, 'field', this.fieldTarget.textures[0]!, 0);
    gl.uniform1i(engine.uniform(this.shadow, 'lampCount'), lamps.length);
    gl.uniform4fv(engine.uniform(this.shadow, 'lamps'), lampData);
    gl.uniform2f(engine.uniform(this.shadow, 'space'), engine.cssWidth, engine.cssHeight);
    gl.uniform1f(engine.uniform(this.shadow, 'height'), target.height);
    gl.uniform1f(engine.uniform(this.shadow, 'scale'), target.width / engine.cssWidth);
    engine.fullscreen();
    return true;
  }
}

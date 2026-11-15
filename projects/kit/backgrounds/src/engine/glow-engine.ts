// What draws a glowing background: one WebGL2 canvas, no library (lenzi, 2026-11-13: "implemented
// either using a canvas using shaders or threejs"; these are flat effects, a rectangle and some
// points, so three.js stays for the 3D). A background gives it a scene of light (its blobs, its
// boids) and the engine does what every glowing background needs:
//
//   scene (light on black) → glow (the light spread wide, in halves) → composite on the solid base
//   colour (added on a dark base; a coloured haze on a light one) → blur of the finished picture (the
//   `blur` every background has) → the screen; and a tiny copy of the light, for the surfaces of the
//   page that it lights (LenziAmbientLight).
//
// A plain module (no schematic makes one).

import { LinearRgb } from './color';

/** The light map's size: the finished light, very small (it lights surfaces, softly). */
export const LIGHT_WIDTH = 32;
export const LIGHT_HEIGHT = 18;

const BLOOM_LEVELS = 7;
/** How much glow `glow` 1 is: right outside a large object, about the object's own light. */
const GLOW = 2.6;
const BLUR_LEVELS = 7;

/** A picture the engine or a scene draws into: a framebuffer with one texture (or more: `textures`). */
export interface GlowTarget {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  textures: WebGLTexture[];
  width: number;
  height: number;
}
type Target = GlowTarget;

/** What a scene's surfaces are drawn from: the finished picture, the same blurred, and the light alone. */
export interface GlowSurfaceInputs {
  /** The finished picture (sRGB), as large as the canvas. */
  picture: WebGLTexture;
  /** The same, blurred about as much as the page's glass blurs (half its size). */
  blurred: WebGLTexture;
  /** The light (linear, unbounded): the glow of everything that shines, spread as the glow spreads. */
  light: WebGLTexture;
  /** The same light spread wide (one of the glow's halvings): what reaches a place from all around; its size, px. */
  ambient: WebGLTexture;
  ambientSize: [number, number];
  /** How much of that light is the glow on the screen (the composite's own gain). */
  lightGain: number;
  /** How bright the objects themselves are drawn (the composite's `core`), and on what: a lamp shown over a surface. */
  core?: number;
  base?: LinearRgb;
}

/**
 * What a background draws, frame by frame: its light, and around it what it may also want (lenzi,
 * 2026-11-14: blobs "di vetro o solidi", that "interagire allo stesso modo delle componenti che abbiamo
 * fatto oggi": glass takes the light, solid stops it).
 */
export interface GlowLayers {
  /** Before the light: the scene's own targets (fields, shadows), drawn with `into`. */
  prepare?(): void;
  /** The scene's light, added (blending on, ONE ONE) into the scene target. */
  draw(): void;
  /** Where the light is stopped: a texture whose red is the share of the glow stopped there (0..1), or null. */
  shadow?(): WebGLTexture | null;
  /** How much of the glow a shadow takes away, 0..1; not said: the frame's (the page's `--lenzi-shadow`). */
  shadowAmount?: number;
  /**
   * Solid things into the finished picture, before glass blurs it (so glass shows them): one fullscreen pass that
   * writes every pixel. `blurred` is the picture itself there. False: nothing drawn, the picture stays.
   */
  solids?(inputs: GlowSurfaceInputs): boolean;
  /**
   * Surfaces over the finished picture: one fullscreen pass that writes every pixel (the picture where there
   * is no surface). The engine binds the target first. False: nothing drawn, the picture stays.
   */
  surfaces?(inputs: GlowSurfaceInputs): boolean;
}

/** What one frame looks like. */
export interface GlowFrame {
  /** The solid colour under the light. */
  base: LinearRgb;
  /** A light base (a light theme): the glow is a coloured haze instead of added light. */
  light: boolean;
  /** How bright the objects themselves are, and their glow around them. */
  core: number;
  glow: number;
  /** How wide the glow spreads, 0 (tight) to 1 (wide). */
  halo: number;
  /** The blur of the finished picture, in CSS px. */
  blur: number;
  /** How much of the last frame stays (0: none), for trails. */
  trail: number;
  /** How much of the glow a shadow takes away, 0..1 (the page's `--lenzi-shadow`). */
  shadow?: number;
}

/** How wide the glass's blur is, CSS px: about the page's glass (`--lenzi-glass-filter`). */
const GLASS_BLUR = 24;
/** The glow's halving that is the light reaching a surface from all around (1/16 of the canvas). */
const AMBIENT_LEVEL = 3;

export const FULLSCREEN_VERTEX = `#version 300 es
out vec2 uv;
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  uv = corner;
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const COPY = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D source;
uniform float gain;
out vec4 color;
void main() { color = texture(source, uv) * gain; }`;

// Dual Kawase: a wide, smooth blur for the price of a few samples at every halving.
const DOWN = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D source;
uniform vec2 halfTexel;
uniform float spread;
out vec4 color;
void main() {
  vec2 o = halfTexel * spread;
  color = (texture(source, uv) * 4.0
    + texture(source, uv - o) + texture(source, uv + o)
    + texture(source, uv + vec2(o.x, -o.y)) + texture(source, uv - vec2(o.x, -o.y))) / 8.0;
}`;

const UP = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D source;
uniform vec2 halfTexel;
uniform float spread;
uniform float gain;
out vec4 color;
void main() {
  vec2 o = halfTexel * spread;
  vec4 sum = texture(source, uv + vec2(-o.x * 2.0, 0.0)) + texture(source, uv + vec2(o.x * 2.0, 0.0))
    + texture(source, uv + vec2(0.0, o.y * 2.0)) + texture(source, uv + vec2(0.0, -o.y * 2.0))
    + (texture(source, uv + vec2(-o.x, o.y)) + texture(source, uv + vec2(o.x, o.y))
    + texture(source, uv + vec2(o.x, -o.y)) + texture(source, uv + vec2(-o.x, -o.y))) * 2.0;
  color = sum / 12.0 * gain;
}`;

const COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D scene;
uniform sampler2D bloom;
uniform sampler2D shadow;
uniform float shadowAmount;
uniform vec3 base;
uniform float core;
uniform float glow;
uniform float light;
uniform float outside;
uniform float dither;
out vec4 color;
vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec4 object = texture(scene, uv);
  // the glow is around the objects, not over them (their alpha says where they are): an object is as
  // bright as "core" says, whatever its size, and a large one is not washed out by its own glow
  // behind a solid thing, away from a light, part of that light's glow is missing (its shadow)
  float shaded = 1.0 - shadowAmount * clamp(texture(shadow, uv).r, 0.0, 1.0);
  vec3 l = max(object.rgb, 0.0) * core + max(texture(bloom, uv).rgb, 0.0) * glow * shaded * (1.0 - outside * clamp(object.a, 0.0, 1.0));
  float most = max(l.r, max(l.g, l.b));
  vec3 own = l / max(most, 1e-4);
  // dark: light added onto the base. More light is more of the object's own colour, never white: the
  // accent stays the accent, and two objects' colours stay apart
  vec3 added = base + (1.0 - base) * own * (1.0 - exp(-most));
  // light: the objects' own colour as a haze over the base, thicker where there is more light
  vec3 haze = mix(base, own, 1.0 - exp(-most * 1.6));
  vec3 c = encode(mix(added, haze, light));
  // a breath of noise: a dark glow in 8 bits would show its steps
  color = vec4(c + (hash(gl_FragCoord.xy) - 0.5) * dither / 255.0, 1.0);
}`;

export class GlowEngine {
  /** The space the scene is drawn in, in CSS px, and how many device px one of them is. */
  cssWidth = 1;
  cssHeight = 1;
  scale = 1;

  private readonly float: boolean;
  private scene: [Target | null, Target | null] = [null, null];
  private bloom: Target[] = [];
  private final: Target | null = null;
  /** The picture with the scene's surfaces over it. */
  private surfaced: Target | null = null;
  private solided: Target | null = null;
  /** No shadow: one black pixel. */
  private readonly noShadow: WebGLTexture;
  private blurs: Target[] = [];
  private lightTarget: Target | null = null;
  private readonly lightPixels = new Uint8Array(LIGHT_WIDTH * LIGHT_HEIGHT * 4);
  private readonly programs = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  private readonly vertexArray: WebGLVertexArrayObject;
  private readonly copy: WebGLProgram;
  private readonly down: WebGLProgram;
  private readonly up: WebGLProgram;
  private readonly composite: WebGLProgram;
  private disposed = false;

  /** null where there is no WebGL2 (the background then shows a still picture in CSS). */
  static create(canvas: HTMLCanvasElement): GlowEngine | null {
    let gl: WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    } catch {
      gl = null;
    }
    if (!gl) return null;
    try {
      return new GlowEngine(gl, canvas);
    } catch {
      return null;
    }
  }

  private constructor(
    readonly gl: WebGL2RenderingContext,
    private readonly canvas: HTMLCanvasElement,
  ) {
    // light adds up beyond 1 before it is brought to the screen: half floats where the GPU draws into them
    this.float = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
    this.vertexArray = gl.createVertexArray()!;
    this.copy = this.program(COPY);
    this.down = this.program(DOWN);
    this.up = this.program(UP);
    this.composite = this.program(COMPOSITE);
    this.noShadow = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.noShadow);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  }

  /** Whether the targets hold light beyond 1 (half floats): what fields of blobs need. */
  get hasFloat(): boolean {
    return this.float;
  }

  /** The canvas's size, device px. */
  get pixelWidth(): number {
    return this.canvas.width;
  }

  get pixelHeight(): number {
    return this.canvas.height;
  }

  /**
   * A target of the scene's own, `attachments` textures drawn at once (a fragment shader with as many
   * outputs). Float: half floats (only where `hasFloat`). The scene frees it with `freeTarget`.
   */
  makeTarget(width: number, height: number, float: boolean, attachments = 1): GlowTarget {
    const gl = this.gl;
    const textures: WebGLTexture[] = [];
    const framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    for (let index = 0; index < attachments; index++) {
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, float ? gl.RGBA16F : gl.RGBA8, width, height, 0, gl.RGBA, float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.TEXTURE_2D, texture, 0);
      textures.push(texture);
    }
    if (attachments > 1) gl.drawBuffers(textures.map((_, index) => gl.COLOR_ATTACHMENT0 + index));
    return { framebuffer, texture: textures[0]!, textures, width, height };
  }

  freeTarget(target: GlowTarget | null): void {
    if (!target) return;
    this.gl.deleteFramebuffer(target.framebuffer);
    for (const texture of target.textures) this.gl.deleteTexture(texture);
  }

  /** Draws from now on into a target, all of it. */
  into(target: GlowTarget): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.framebuffer);
    this.gl.viewport(0, 0, target.width, target.height);
  }

  /** A texture for a sampler of a program, on a texture unit. */
  useTexture(program: WebGLProgram, name: string, texture: WebGLTexture, unit: number): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.uniform(program, name), unit);
  }

  /** A program of the scene or of the engine; a shader that does not compile says why. */
  program(fragment: string, vertex = FULLSCREEN_VERTEX): WebGLProgram {
    const gl = this.gl;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`Shader: ${gl.getShaderInfoLog(shader) ?? 'not compiled'}`);
      return shader;
    };
    const program = gl.createProgram()!;
    const shaders = [compile(gl.VERTEX_SHADER, vertex), compile(gl.FRAGMENT_SHADER, fragment)];
    for (const shader of shaders) gl.attachShader(program, shader);
    gl.linkProgram(program);
    for (const shader of shaders) gl.deleteShader(shader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Program: ${gl.getProgramInfoLog(program) ?? 'not linked'}`);
    this.programs.set(program, new Map());
    return program;
  }

  /** A uniform of a program (looked up once). */
  uniform(program: WebGLProgram, name: string): WebGLUniformLocation | null {
    const known = this.programs.get(program)!;
    if (!known.has(name)) known.set(name, this.gl.getUniformLocation(program, name));
    return known.get(name) ?? null;
  }

  /** Draws over the whole target with the program in use. */
  fullscreen(): void {
    this.gl.bindVertexArray(this.vertexArray);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }

  /** The canvas's size in CSS px, and how many device px one of them is: the targets follow. */
  resize(cssWidth: number, cssHeight: number, scale: number): void {
    const width = Math.max(2, Math.round(cssWidth * scale));
    const height = Math.max(2, Math.round(cssHeight * scale));
    this.cssWidth = Math.max(1, cssWidth);
    this.cssHeight = Math.max(1, cssHeight);
    this.scale = scale;
    if (this.canvas.width === width && this.canvas.height === height && this.final) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.freeTargets();
    this.scene = [this.target(width, height, this.float), this.target(width, height, this.float)];
    for (let level = 1; level <= BLOOM_LEVELS; level++) {
      const w = width >> level;
      const h = height >> level;
      if (w < 2 || h < 2) break;
      this.bloom.push(this.target(w, h, this.float));
    }
    this.final = this.target(width, height, false);
    this.surfaced = this.target(width, height, false);
    this.solided = this.target(width, height, false);
    for (let level = 1; level <= BLUR_LEVELS; level++) {
      const w = width >> level;
      const h = height >> level;
      if (w < 2 || h < 2) break;
      this.blurs.push(this.target(w, h, false));
    }
    this.lightTarget = this.target(LIGHT_WIDTH, LIGHT_HEIGHT, false);
  }

  /**
   * One frame. The scene's `draw` adds its light (blending is on, added: more light where things overlap)
   * into a target as large as the canvas, cleared to black or holding what is left of the last frame; its
   * `prepare`, `shadow` and `surfaces`, if it has them, come before, into and after the picture.
   */
  render(frame: GlowFrame, layers: GlowLayers): void {
    const gl = this.gl;
    const [previous, current] = this.scene;
    if (this.disposed || !previous || !current || !this.final || !this.surfaced || !this.solided || !this.lightTarget) return;

    // 0. the scene's own targets
    if (layers.prepare) {
      gl.disable(gl.BLEND);
      layers.prepare();
      gl.disable(gl.BLEND);
    }

    // 1. the scene's light
    this.into(current);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (frame.trail > 0) this.blit(this.copy, previous, frame.trail);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    layers.draw();
    gl.disable(gl.BLEND);
    this.scene = [current, previous];

    // 2. the glow: halved again and again, then added back on the way up
    let source = current;
    for (const level of this.bloom) {
      this.into(level);
      this.kawase(this.down, source, 1, 1);
      source = level;
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    // every wider halving weighs `wide` times the one before it: a tight glow is mostly the narrow
    // ones, a wide glow all of them
    const wide = 0.5 + 0.55 * Math.min(1, Math.max(0, frame.halo));
    let weight = 0;
    for (let level = this.bloom.length - 1; level > 0; level--) {
      this.into(this.bloom[level - 1]!);
      this.kawase(this.up, this.bloom[level]!, 1, wide);
    }
    for (let level = 0; level < this.bloom.length; level++) weight += wide ** level;
    gl.disable(gl.BLEND);
    // the same glow in all, however wide: `halo` spreads it, `glow` is how much there is
    const strength = (frame.glow * GLOW) / Math.max(1, weight);
    const bloom = this.bloom[0] ?? current;
    const deepest = this.bloom[this.bloom.length - 1] ?? current;

    // 3. on the base colour, the glow darkened where something solid stops the light
    this.into(this.final);
    const shadow = layers.shadow?.() ?? null;
    this.compose(current, bloom, frame, frame.core, strength, 1, 1, shadow, shadow ? (layers.shadowAmount ?? frame.shadow ?? 0.6) : 0);

    // 3½. the scene's surfaces over the picture (glass, solid): from the picture, the picture blurred as glass
    // blurs, and the light alone
    let picture = this.final;
    // what reaches a place from all around: a wide halving, but not the widest (a few pixels, it shows its steps)
    const ambient = this.bloom[Math.min(AMBIENT_LEVEL, this.bloom.length - 1)] ?? current;
    const light = { light: bloom.texture, ambient: ambient.texture, ambientSize: [ambient.width, ambient.height] as [number, number], lightGain: strength, core: frame.core, base: frame.base };
    // the solid things first, into the picture: glass shows them blurred through itself
    if (layers.solids) {
      this.into(this.solided);
      if (layers.solids({ ...light, picture: picture.texture, blurred: picture.texture })) picture = this.solided;
    }
    if (layers.surfaces) {
      const blurred = this.blurred(picture, GLASS_BLUR * this.scale);
      this.into(this.surfaced);
      if (layers.surfaces({ ...light, picture: picture.texture, blurred: blurred.texture })) picture = this.surfaced;
    }

    // 4. the blur of the finished picture
    const shown = this.blurred(picture, frame.blur * this.scale);

    // 5. the screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.blit(this.copy, shown, 1);

    // 6. the light of the whole picture, very small: what the page's lit surfaces take
    this.into(this.lightTarget);
    this.compose(deepest, deepest, frame, frame.core, frame.glow * 1.2, 0, 0, null, 0);
  }

  /** The finished light, very small: LIGHT_WIDTH × LIGHT_HEIGHT pixels (r, g, b, a), the top row first. */
  readLight(): Uint8Array {
    const gl = this.gl;
    if (this.disposed || !this.lightTarget) return this.lightPixels;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightTarget.framebuffer);
    const rows = new Uint8Array(LIGHT_WIDTH * LIGHT_HEIGHT * 4);
    gl.readPixels(0, 0, LIGHT_WIDTH, LIGHT_HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, rows);
    // WebGL's first row is the bottom one
    const row = LIGHT_WIDTH * 4;
    for (let y = 0; y < LIGHT_HEIGHT; y++) this.lightPixels.set(rows.subarray((LIGHT_HEIGHT - 1 - y) * row, (LIGHT_HEIGHT - y) * row), y * row);
    return this.lightPixels;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.freeTargets();
    this.gl.deleteTexture(this.noShadow);
    for (const program of this.programs.keys()) this.gl.deleteProgram(program);
    this.gl.deleteVertexArray(this.vertexArray);
    // the browser keeps few WebGL contexts: this one is given back now, not when the canvas is collected
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  private bind(program: WebGLProgram, name: string, target: Target, unit: number): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    gl.uniform1i(this.uniform(program, name), unit);
  }

  private blit(program: WebGLProgram, source: Target, gain: number): void {
    const gl = this.gl;
    gl.useProgram(program);
    this.bind(program, 'source', source, 0);
    gl.uniform1f(this.uniform(program, 'gain'), gain);
    this.fullscreen();
  }

  private kawase(program: WebGLProgram, source: Target, spread: number, gain: number): void {
    const gl = this.gl;
    gl.useProgram(program);
    this.bind(program, 'source', source, 0);
    gl.uniform2f(this.uniform(program, 'halfTexel'), 0.5 / source.width, 0.5 / source.height);
    gl.uniform1f(this.uniform(program, 'spread'), spread);
    gl.uniform1f(this.uniform(program, 'gain'), gain);
    this.fullscreen();
  }

  /** `outside` 1: the glow only around the objects (the picture); 0: everywhere (the light map, where there are no edges). */
  private compose(scene: Target, bloom: Target, frame: GlowFrame, core: number, glow: number, dither: number, outside: number, shadow: WebGLTexture | null, shadowAmount: number): void {
    const gl = this.gl;
    const program = this.composite;
    gl.useProgram(program);
    this.bind(program, 'scene', scene, 0);
    this.bind(program, 'bloom', bloom, 1);
    this.useTexture(program, 'shadow', shadow ?? this.noShadow, 2);
    gl.uniform1f(this.uniform(program, 'shadowAmount'), Math.min(1, Math.max(0, shadowAmount)));
    gl.uniform3f(this.uniform(program, 'base'), frame.base[0], frame.base[1], frame.base[2]);
    gl.uniform1f(this.uniform(program, 'core'), core);
    gl.uniform1f(this.uniform(program, 'glow'), glow);
    gl.uniform1f(this.uniform(program, 'light'), frame.light ? 1 : 0);
    gl.uniform1f(this.uniform(program, 'outside'), outside);
    gl.uniform1f(this.uniform(program, 'dither'), dither);
    this.fullscreen();
  }

  /** The picture blurred by about `radius` device px: down a few halvings and back up. */
  private blurred(picture: Target, radius: number): Target {
    if (radius < 0.5 || this.blurs.length === 0) return picture;
    const levels = Math.min(this.blurs.length, Math.max(1, Math.ceil(Math.log2(radius / 1.5))));
    // between two numbers of halvings the samples move apart, so the blur grows evenly
    const spread = Math.min(2, Math.max(0.1, radius / (1.5 * 2 ** levels)) * 2);
    let source = picture;
    for (let level = 0; level < levels; level++) {
      this.into(this.blurs[level]!);
      this.kawase(this.down, source, spread, 1);
      source = this.blurs[level]!;
    }
    for (let level = levels - 1; level > 0; level--) {
      this.into(this.blurs[level - 1]!);
      this.kawase(this.up, this.blurs[level]!, spread, 1);
    }
    // the first level, half the picture's size: the copy to the screen stretches it back, smoothly
    return this.blurs[0]!;
  }

  private target(width: number, height: number, float: boolean): Target {
    const gl = this.gl;
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, float ? gl.RGBA16F : gl.RGBA8, width, height, 0, gl.RGBA, float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return { framebuffer, texture, textures: [texture], width, height };
  }

  private freeTargets(): void {
    for (const target of [...this.scene, ...this.bloom, this.final, this.surfaced, this.solided, ...this.blurs, this.lightTarget]) this.freeTarget(target);
    this.scene = [null, null];
    this.bloom = [];
    this.final = null;
    this.surfaced = null;
    this.solided = null;
    this.blurs = [];
    this.lightTarget = null;
  }
}

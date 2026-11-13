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

const BLOOM_LEVELS = 6;
const BLUR_LEVELS = 7;

interface Target {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
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
}

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
uniform vec3 base;
uniform float core;
uniform float glow;
uniform float light;
uniform float dither;
out vec4 color;
vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 l = max(texture(scene, uv).rgb, 0.0) * core + max(texture(bloom, uv).rgb, 0.0) * glow;
  // dark: light added onto the base, bending towards white instead of clipping
  vec3 added = base + (1.0 - base) * (1.0 - exp(-l));
  // light: the objects' own colour as a haze over the base, thicker where there is more light
  float most = max(l.r, max(l.g, l.b));
  vec3 haze = mix(base, l / max(most, 1e-4), 1.0 - exp(-most * 1.6));
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
    for (let level = 1; level <= BLUR_LEVELS; level++) {
      const w = width >> level;
      const h = height >> level;
      if (w < 2 || h < 2) break;
      this.blurs.push(this.target(w, h, false));
    }
    this.lightTarget = this.target(LIGHT_WIDTH, LIGHT_HEIGHT, false);
  }

  /**
   * One frame. `draw` adds the scene's light (blending is on, added: more light where things overlap)
   * into a target as large as the canvas, cleared to black or holding what is left of the last frame.
   */
  render(frame: GlowFrame, draw: () => void): void {
    const gl = this.gl;
    const [previous, current] = this.scene;
    if (this.disposed || !previous || !current || !this.final || !this.lightTarget) return;

    // 1. the scene's light
    this.into(current);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (frame.trail > 0) this.blit(this.copy, previous, frame.trail);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    draw();
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
    const wide = 0.35 + 0.65 * Math.min(1, Math.max(0, frame.halo));
    for (let level = this.bloom.length - 1; level > 0; level--) {
      this.into(this.bloom[level - 1]!);
      this.kawase(this.up, this.bloom[level]!, 1, wide);
    }
    gl.disable(gl.BLEND);
    const levels = Math.max(1, this.bloom.length);
    const bloom = this.bloom[0] ?? current;
    const deepest = this.bloom[this.bloom.length - 1] ?? current;

    // 3. on the base colour
    this.into(this.final);
    this.compose(current, bloom, frame, frame.core, (frame.glow * 2.2) / levels, 1);

    // 4. the blur of the finished picture
    const shown = this.blurred(this.final, frame.blur * this.scale);

    // 5. the screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.blit(this.copy, shown, 1);

    // 6. the light of the whole picture, very small: what the page's lit surfaces take
    this.into(this.lightTarget);
    this.compose(deepest, deepest, frame, frame.core, frame.glow * 1.2, 0);
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
    for (const program of this.programs.keys()) this.gl.deleteProgram(program);
    this.gl.deleteVertexArray(this.vertexArray);
    // the browser keeps few WebGL contexts: this one is given back now, not when the canvas is collected
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  private into(target: Target): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.framebuffer);
    this.gl.viewport(0, 0, target.width, target.height);
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

  private compose(scene: Target, bloom: Target, frame: GlowFrame, core: number, glow: number, dither: number): void {
    const gl = this.gl;
    const program = this.composite;
    gl.useProgram(program);
    this.bind(program, 'scene', scene, 0);
    this.bind(program, 'bloom', bloom, 1);
    gl.uniform3f(this.uniform(program, 'base'), frame.base[0], frame.base[1], frame.base[2]);
    gl.uniform1f(this.uniform(program, 'core'), core);
    gl.uniform1f(this.uniform(program, 'glow'), glow);
    gl.uniform1f(this.uniform(program, 'light'), frame.light ? 1 : 0);
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
    return { framebuffer, texture, width, height };
  }

  private freeTargets(): void {
    const gl = this.gl;
    for (const target of [...this.scene, ...this.bloom, this.final, ...this.blurs, this.lightTarget]) {
      if (!target) continue;
      gl.deleteFramebuffer(target.framebuffer);
      gl.deleteTexture(target.texture);
    }
    this.scene = [null, null];
    this.bloom = [];
    this.final = null;
    this.blurs = [];
    this.lightTarget = null;
  }
}

// The boids as light: one small glowing mark for each, drawn in one call (instanced), added onto the
// others, so a crowd is brighter than a boid alone. A dot, or a dart that points where it flies. A plain
// module (no schematic makes one).

import { Boids } from './boids';
import { GlowEngine } from './glow-engine';

const VERTEX = `#version 300 es
layout(location = 0) in vec4 boid;   // x, y, vx, vy (CSS px, from the top left)
layout(location = 1) in vec3 tint;
layout(location = 2) in float scale; // this boid's size, times the common one
uniform vec2 space;                  // the space, CSS px
uniform float size;                  // half a boid's width, CSS px
uniform float stretch;               // how much longer than wide
out vec2 corner;
out vec3 hue;
void main() {
  corner = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1)) * 2.0 - 1.0;
  float speed = length(boid.zw);
  vec2 ahead = speed > 0.001 ? boid.zw / speed : vec2(1.0, 0.0);
  vec2 aside = vec2(-ahead.y, ahead.x);
  float half_ = size * scale;
  vec2 p = boid.xy + ahead * corner.x * half_ * stretch + aside * corner.y * half_;
  vec2 clip = p / space * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  hue = tint;
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 corner;
in vec3 hue;
uniform float kind;        // 0: a dot; 1: a dart; 2: a drop
uniform float stretch;     // how much longer than wide
uniform float brightness;
out vec4 color;

// a circle of radius r1 at the origin and one of r2 at (0, h), joined by the lines tangent to both (Inigo
// Quilez's uneven capsule): below 0 inside
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
  float light;
  if (kind < 0.5) {
    light = pow(max(0.0, 1.0 - length(corner)), 1.5);
  } else if (kind < 1.5) {
    // a dart: wide and bright at the head (corner.x = 1), thin and faint at the tail
    float along = corner.x * 0.5 + 0.5;
    float width = mix(0.1, 0.85, along * along);
    light = smoothstep(width, width * 0.25, abs(corner.y)) * smoothstep(0.0, 0.3, along) * smoothstep(1.0, 0.8, along);
  } else {
    // a drop (lenzi, 2026-11-14: "rendi i boids delle gocce piú che triangoli", "la coda arrotondata"): a round
    // head ahead, narrowing to a small round tail; brighter at the head
    vec2 q = vec2(corner.x * stretch, corner.y);
    float head = stretch - 0.9;
    float tail = -stretch + 0.32;
    float edge = unevenCapsule(vec2(q.y, head - q.x), 0.9, 0.32, head - tail);
    float along = clamp((q.x - tail) / (head - tail), 0.0, 1.0);
    light = smoothstep(0.18, -0.18, edge) * mix(0.5, 1.0, along);
  }
  light *= brightness;
  color = vec4(hue * light, light);
}`;

/** What a boid looks like: a dot, a dart, a drop. */
export type BoidShape = 'dot' | 'dart' | 'drop';

/** How much longer than wide each shape is (its length from its middle, in half widths). */
export const BOID_STRETCH: Readonly<Record<BoidShape, number>> = { dot: 1, dart: 2.6, drop: 2.2 };

/**
 * How the boids differ in size (lenzi, 2026-11-14: "i boid dovrebbero essere tutti leggermente di dimensioni
 * diverse, il 'leader' dovrebbe essere piú grande"): `variety` 0 (all alike) to 1 (half to one and a half
 * times), `leader` how many times larger a colony's leader is.
 */
export interface BoidSizes {
  variety: number;
  leader: number;
}

/** The flock backgrounds' own: a little different each, the leaders nearly twice as large and a little followed. */
export const DEFAULT_BOID_SIZES: BoidSizes = { variety: 0.4, leader: 1.9 };
export const DEFAULT_LEADER_PULL = 0.4;

/** Each boid's size, times the common one: its own number spread by the variety; a leader, larger. */
export function boidScales(flock: Boids, count: number, sizes: BoidSizes): Float32Array {
  const scales = new Float32Array(count);
  const variety = Math.min(1, Math.max(0, sizes.variety)) * 0.5;
  for (let i = 0; i < count; i++) scales[i] = flock.isLeader(i) ? Math.max(0.1, sizes.leader) : 1 + variety * (flock.own[i]! * 2 - 1);
  return scales;
}

export class FlockScene {
  private readonly program: WebGLProgram;
  private readonly vertexArray: WebGLVertexArrayObject;
  private readonly boidBuffer: WebGLBuffer;
  private readonly tintBuffer: WebGLBuffer;
  private readonly scaleBuffer: WebGLBuffer;
  private boidData = new Float32Array(0);
  private tints: Float32Array | null = null;
  private scaleKey = '';
  private scaleFlock: Boids | null = null;

  constructor(private readonly engine: GlowEngine) {
    const gl = engine.gl;
    this.program = engine.program(FRAGMENT, VERTEX);
    this.vertexArray = gl.createVertexArray()!;
    this.boidBuffer = gl.createBuffer()!;
    this.tintBuffer = gl.createBuffer()!;
    this.scaleBuffer = gl.createBuffer()!;
    gl.bindVertexArray(this.vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.boidBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tintBuffer);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.scaleBuffer);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);
  }

  /**
   * @param colors r, g, b of every boid (linear); sent to the GPU only when it is another array
   * @param size half a boid's width, CSS px
   * @param shape a dot, a dart pointing where it flies, or a drop (its round head ahead)
   * @param sizes how much the boids differ in size, and how large a colony's leader is (boidScales)
   */
  draw(flock: Boids, colors: Float32Array, size: number, shape: BoidShape, brightness: number, sizes: BoidSizes = { variety: 0, leader: 1 }): void {
    const { engine, program } = this;
    const gl = engine.gl;
    const count = Math.min(flock.count, Math.floor(colors.length / 3));
    if (count === 0) return;
    if (this.boidData.length !== count * 4) this.boidData = new Float32Array(count * 4);
    const data = this.boidData;
    for (let i = 0; i < count; i++) {
      data[i * 4] = flock.x[i]!;
      data[i * 4 + 1] = flock.y[i]!;
      data[i * 4 + 2] = flock.vx[i]!;
      data[i * 4 + 3] = flock.vy[i]!;
    }
    gl.bindVertexArray(this.vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.boidBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    if (this.tints !== colors) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.tintBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
      this.tints = colors;
    }
    // each boid's size: sent again only when they change (another flock, count, variety, leaders)
    const key = `${count}|${sizes.variety}|${sizes.leader}|${flock.leaders}`;
    if (key !== this.scaleKey || flock !== this.scaleFlock) {
      this.scaleKey = key;
      this.scaleFlock = flock;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.scaleBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, boidScales(flock, count, sizes), gl.STATIC_DRAW);
    }
    gl.useProgram(program);
    gl.uniform2f(engine.uniform(program, 'space'), engine.cssWidth, engine.cssHeight);
    gl.uniform1f(engine.uniform(program, 'size'), size);
    gl.uniform1f(engine.uniform(program, 'stretch'), BOID_STRETCH[shape]);
    gl.uniform1f(engine.uniform(program, 'kind'), shape === 'dot' ? 0 : shape === 'dart' ? 1 : 2);
    gl.uniform1f(engine.uniform(program, 'brightness'), brightness);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    const gl = this.engine.gl;
    gl.deleteBuffer(this.boidBuffer);
    gl.deleteBuffer(this.tintBuffer);
    gl.deleteBuffer(this.scaleBuffer);
    gl.deleteVertexArray(this.vertexArray);
  }
}

// The boids as light: one small glowing mark for each, drawn in one call (instanced), added onto the
// others, so a crowd is brighter than a boid alone. A dot, or a dart that points where it flies. A plain
// module (no schematic makes one).

import { Boids } from './boids';
import { GlowEngine } from './glow-engine';

const VERTEX = `#version 300 es
layout(location = 0) in vec4 boid;   // x, y, vx, vy (CSS px, from the top left)
layout(location = 1) in vec3 tint;
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
  vec2 p = boid.xy + ahead * corner.x * size * stretch + aside * corner.y * size;
  vec2 clip = p / space * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  hue = tint;
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 corner;
in vec3 hue;
uniform float dart;        // 0: a dot; 1: a dart
uniform float brightness;
out vec4 color;
void main() {
  float dot_ = pow(max(0.0, 1.0 - length(corner)), 1.5);
  // a dart: wide and bright at the head (corner.x = 1), thin and faint at the tail
  float along = corner.x * 0.5 + 0.5;
  float width = mix(0.1, 0.85, along * along);
  float body = smoothstep(width, width * 0.25, abs(corner.y)) * smoothstep(0.0, 0.3, along) * smoothstep(1.0, 0.8, along);
  float light = mix(dot_, body, dart) * brightness;
  color = vec4(hue * light, light);
}`;

export class FlockScene {
  private readonly program: WebGLProgram;
  private readonly vertexArray: WebGLVertexArrayObject;
  private readonly boidBuffer: WebGLBuffer;
  private readonly tintBuffer: WebGLBuffer;
  private boidData = new Float32Array(0);
  private tints: Float32Array | null = null;

  constructor(private readonly engine: GlowEngine) {
    const gl = engine.gl;
    this.program = engine.program(FRAGMENT, VERTEX);
    this.vertexArray = gl.createVertexArray()!;
    this.boidBuffer = gl.createBuffer()!;
    this.tintBuffer = gl.createBuffer()!;
    gl.bindVertexArray(this.vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.boidBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tintBuffer);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);
  }

  /**
   * @param colors r, g, b of every boid (linear); sent to the GPU only when it is another array
   * @param size half a boid's width, CSS px
   * @param shape a dot, or a dart pointing where it flies
   */
  draw(flock: Boids, colors: Float32Array, size: number, shape: 'dot' | 'dart', brightness: number): void {
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
    gl.useProgram(program);
    gl.uniform2f(engine.uniform(program, 'space'), engine.cssWidth, engine.cssHeight);
    gl.uniform1f(engine.uniform(program, 'size'), size);
    gl.uniform1f(engine.uniform(program, 'stretch'), shape === 'dart' ? 2.6 : 1);
    gl.uniform1f(engine.uniform(program, 'dart'), shape === 'dart' ? 1 : 0);
    gl.uniform1f(engine.uniform(program, 'brightness'), brightness);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    const gl = this.engine.gl;
    gl.deleteBuffer(this.boidBuffer);
    gl.deleteBuffer(this.tintBuffer);
    gl.deleteVertexArray(this.vertexArray);
  }
}

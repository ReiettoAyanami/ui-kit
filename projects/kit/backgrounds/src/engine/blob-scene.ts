// The blobs as light: every pixel asks every blob how far its edge is (its shape's radius in that
// direction), and the answers are joined softly, so blobs that come close melt into one (lenzi,
// 2026-11-13: "i want them to be able to merge together"); the colour of a pixel is every blob's
// colour, weighted by how much of the join is its own. A plain module (no schematic makes one).

import { BlobState, MAX_BLOBS, shapeUniforms } from './blob-field';
import { GlowEngine } from './glow-engine';

const FRAGMENT = `#version 300 es
precision highp float;
#define MAX ${MAX_BLOBS}
uniform int count;
uniform float height;      // of the target, device px
uniform float scale;       // device px in a CSS px
uniform vec3 place[MAX];   // x, y (CSS px, from the top left), radius
uniform vec2 turn[MAX];    // rotation, how far from shape A to shape B
uniform vec4 superA[MAX];  // m, n1, n2, reach
uniform vec3 lobesA[MAX];  // lobes, depth, sharp
uniform vec4 superB[MAX];
uniform vec3 lobesB[MAX];
uniform vec3 tint[MAX];
uniform float merge;       // how softly they join, CSS px
uniform float soft;        // how soft the edge is, CSS px
out vec4 color;

// shapes.ts's shapeRadius, here: the superformula's rounded polygon times the scallop of the lobes
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
  vec2 p = vec2(gl_FragCoord.x, height - gl_FragCoord.y) / scale;
  float k = max(merge, 1.0);
  float weights = 0.0;
  vec3 colours = vec3(0.0);
  for (int i = 0; i < MAX; i++) {
    if (i >= count) break;
    vec2 d = p - place[i].xy;
    float far = length(d);
    // too far to matter: its weight would be nothing
    if (far > place[i].z + k * 12.0 + soft) continue;
    float angle = atan(d.y, d.x) + turn[i].x;
    float radius = mix(shapeRadius(superA[i], lobesA[i], angle), shapeRadius(superB[i], lobesB[i], angle), turn[i].y) * place[i].z;
    float weight = exp(min((radius - far) / k, 60.0));
    weights += weight;
    colours += tint[i] * weight;
  }
  if (weights <= 0.0) { color = vec4(0.0); return; }
  // the soft join of every edge: inside is negative
  float edge = -k * log(weights);
  float fill = smoothstep(soft, -soft, edge);
  // a little more light towards the middle of a blob
  float depth = clamp(-edge / (k * 6.0 + 60.0), 0.0, 1.0);
  color = vec4(colours / weights * fill * (0.72 + 0.28 * depth), fill);
}`;

export class BlobScene {
  private readonly program: WebGLProgram;
  private readonly place = new Float32Array(MAX_BLOBS * 3);
  private readonly turn = new Float32Array(MAX_BLOBS * 2);
  private readonly superA = new Float32Array(MAX_BLOBS * 4);
  private readonly lobesA = new Float32Array(MAX_BLOBS * 3);
  private readonly superB = new Float32Array(MAX_BLOBS * 4);
  private readonly lobesB = new Float32Array(MAX_BLOBS * 3);

  constructor(private readonly engine: GlowEngine) {
    this.program = engine.program(FRAGMENT);
  }

  /**
   * @param colors r, g, b of every blob (linear), one after the other
   * @param merge how softly the blobs join, CSS px
   * @param soft how soft their edge is, CSS px
   */
  draw(blobs: readonly BlobState[], colors: Float32Array, merge: number, soft: number): void {
    const { engine, program } = this;
    const gl = engine.gl;
    const count = Math.min(MAX_BLOBS, blobs.length);
    for (let i = 0; i < count; i++) {
      const blob = blobs[i]!;
      this.place.set([blob.x, blob.y, blob.radius], i * 3);
      this.turn.set([blob.rotation, blob.mix], i * 2);
      const a = shapeUniforms(blob.from);
      const b = shapeUniforms(blob.to);
      this.superA.set(a.slice(0, 4), i * 4);
      this.lobesA.set(a.slice(4), i * 3);
      this.superB.set(b.slice(0, 4), i * 4);
      this.lobesB.set(b.slice(4), i * 3);
    }
    gl.useProgram(program);
    gl.uniform1i(engine.uniform(program, 'count'), count);
    gl.uniform1f(engine.uniform(program, 'height'), engine.cssHeight * engine.scale);
    gl.uniform1f(engine.uniform(program, 'scale'), engine.scale);
    gl.uniform3fv(engine.uniform(program, 'place'), this.place);
    gl.uniform2fv(engine.uniform(program, 'turn'), this.turn);
    gl.uniform4fv(engine.uniform(program, 'superA'), this.superA);
    gl.uniform3fv(engine.uniform(program, 'lobesA'), this.lobesA);
    gl.uniform4fv(engine.uniform(program, 'superB'), this.superB);
    gl.uniform3fv(engine.uniform(program, 'lobesB'), this.lobesB);
    gl.uniform3fv(engine.uniform(program, 'tint'), colors.subarray(0, MAX_BLOBS * 3).length === MAX_BLOBS * 3 ? colors.subarray(0, MAX_BLOBS * 3) : padded(colors));
    gl.uniform1f(engine.uniform(program, 'merge'), merge);
    gl.uniform1f(engine.uniform(program, 'soft'), Math.max(0.5, soft));
    engine.fullscreen();
  }
}

/** The colours, as long as the shader's array. */
function padded(colors: Float32Array): Float32Array {
  const all = new Float32Array(MAX_BLOBS * 3);
  all.set(colors.subarray(0, MAX_BLOBS * 3));
  return all;
}

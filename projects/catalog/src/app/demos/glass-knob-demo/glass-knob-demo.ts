import { Component, computed, inject, input, signal } from '@angular/core';
import { BLOB_SHAPE_NAMES, BlobShapeName, LenziGlassKnob, LenziGlassSlider, LenziKnobShape } from '@lenzi/ui-kit/backgrounds';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** LenziGlassKnob in a slider over stripes of the theme's colours: its shape, how it grows, how it turns. */
@Component({
  selector: 'app-glass-knob-demo',
  imports: [LenziGlassKnob, LenziGlassSlider],
  templateUrl: './glass-knob-demo.html',
  styleUrl: './glass-knob-demo.css',
})
export class GlassKnobDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);
  protected readonly value = signal(40);

  protected readonly shape = computed<LenziKnobShape>(() => {
    const shape = String(this.values()['shape'] ?? 'cookie9');
    return shape === 'capsule' || shape === 'circle' || shape === 'bar' || (BLOB_SHAPE_NAMES as string[]).includes(shape) ? (shape as LenziKnobShape) : 'cookie9';
  });
  /** It turns through a few of the blobs' shapes, when asked and when it is a blob. */
  protected readonly morph = computed<BlobShapeName[]>(() => (this.values()['morph'] === false ? [] : ['flower', 'clover4', 'sunny']));
  protected readonly grow = computed(() => Number(this.values()['grow'] ?? 1.35));
  protected readonly growDuration = computed(() => Number(this.values()['growDuration'] ?? 240));
  protected readonly morphDuration = computed(() => Number(this.values()['morphDuration'] ?? 1600));

  protected set(value: number): void {
    this.value.set(value);
    this.events.log(`${value}`);
  }
}

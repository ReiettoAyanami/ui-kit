import { Component, inject, input, signal } from '@angular/core';
import { BLOB_SHAPE_NAMES, LenziGlassSlider, LenziSliderThumb } from '@lenzi/ui-kit/backgrounds';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** LenziGlassSlider over stripes of the theme's colours, so its glass has something to bend. */
@Component({
  selector: 'app-glass-slider-demo',
  imports: [LenziGlassSlider],
  templateUrl: './glass-slider-demo.html',
  styleUrl: './glass-slider-demo.css',
})
export class GlassSliderDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);
  protected readonly value = signal(40);

  protected shape(value: unknown): LenziSliderThumb {
    return value === 'circle' || value === 'bar' || (BLOB_SHAPE_NAMES as unknown[]).includes(value) ? (value as LenziSliderThumb) : 'capsule';
  }

  protected set(value: number): void {
    this.value.set(value);
    this.events.log(`${value}`);
  }
}

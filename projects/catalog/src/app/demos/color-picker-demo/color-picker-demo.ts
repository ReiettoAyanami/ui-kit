import { Component, computed, inject, input, linkedSignal } from '@angular/core';

import { LenziColorChoice, LenziColorPicker } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** The colours the demo's app offers: the theme's own (variables work) and two of its own. */
const PALETTE: LenziColorChoice[] = [
  { value: 'var(--mat-sys-primary)', label: 'Violet' },
  { value: 'var(--mat-sys-tertiary)', label: 'Cyan' },
  { value: 'var(--lenzi-status-good)', label: 'Green' },
  { value: 'var(--lenzi-status-bad)', label: 'Red' },
  { value: '#ffd54f', label: 'Amber' },
  { value: '#8ab4f8', label: 'Blue' },
];

/** A thing with a colour of its own: its swatch beside its name; what it colours follows the selector. */
@Component({
  selector: 'app-color-picker-demo',
  imports: [LenziColorPicker],
  templateUrl: './color-picker-demo.html',
  styleUrl: './color-picker-demo.css',
})
export class ColorPickerDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);

  protected readonly label = computed(() => String(this.values()['label'] ?? 'Shift colour'));
  protected readonly size = computed(() => Number(this.values()['size'] ?? 32));
  protected readonly disabled = computed(() => this.values()['disabled'] === true);
  protected readonly choices = computed(() => (this.values()['choices'] === false ? [] : PALETTE));
  /** The colour: the parameter's, until the selector moves it. */
  protected readonly colour = linkedSignal(() => String(this.values()['value'] ?? '#d5baff'));

  protected picked(hex: string): void {
    this.events.log(`picked ${hex}`);
  }
}

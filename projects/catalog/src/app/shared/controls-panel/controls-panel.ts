import { Component, input, model, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';

import { LenziColorPicker } from '@lenzi/ui-kit';

import { Control, Values } from '../../registry';

/**
 * The GUI of a demo: one field per parameter (text, a slider, a switch, the choices as pills or a
 * select, a colour picker). Every change goes to the demo at once; Reset brings the defaults back.
 */
@Component({
  selector: 'app-controls-panel',
  imports: [LenziColorPicker, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatSliderModule],
  templateUrl: './controls-panel.html',
  styleUrl: './controls-panel.css',
})
export class ControlsPanel {
  readonly controls = input.required<readonly Control[]>();
  readonly values = model.required<Values>();
  readonly reset = output<void>();

  protected set(key: string, value: string | number | boolean): void {
    this.values.update((values) => ({ ...values, [key]: value }));
  }

  protected number(text: string, control: Control): number {
    const value = Number(text);
    if (Number.isNaN(value)) return Number(control.default);
    return Math.min(control.max ?? value, Math.max(control.min ?? value, value));
  }
}

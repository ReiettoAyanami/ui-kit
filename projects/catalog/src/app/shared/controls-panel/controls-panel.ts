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
import { LenziLit, lenziOverBackground } from '@lenzi/ui-kit/backgrounds';

/** The pills' room on one line of the panel, px, and what a pill takes: a character of its label, and its own padding. */
const PILLS_ROOM = 280;
const PILL_CHARACTER = 8;
const PILL_PADDING = 32;

/**
 * The GUI of a demo: one field per parameter (text, a slider, a switch, the choices as pills or a
 * select, a colour picker). Every change goes to the demo at once; Reset brings the defaults back.
 */
@Component({
  selector: 'app-controls-panel',
  imports: [LenziColorPicker, LenziLit, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSliderModule, MatSlideToggleModule],
  templateUrl: './controls-panel.html',
  styleUrl: './controls-panel.css',
})
export class ControlsPanel {
  /** Over a background its surfaces are lit, solid without one (RULES.md, 2026-11-17). */
  protected readonly lit = lenziOverBackground();

  readonly controls = input.required<readonly Control[]>();
  readonly values = model.required<Values>();
  readonly reset = output<void>();

  protected set(key: string, value: string | number | boolean): void {
    this.values.update((values) => ({ ...values, [key]: value }));
  }

  /**
   * The choices as pills when they are few and fit on one line; a select otherwise (lenzi, 2026-11-19: three pills with
   * long labels wrapped onto two lines, "il selettore sulla destra é fottuto").
   */
  protected pills(control: Control): boolean {
    const options = control.options ?? [];
    const width = options.reduce((sum, option) => sum + option.label.length * PILL_CHARACTER + PILL_PADDING, 0);
    return options.length <= 3 && width <= PILLS_ROOM;
  }

  protected number(text: string, control: Control): number {
    const value = Number(text);
    if (Number.isNaN(value)) return Number(control.default);
    return Math.min(control.max ?? value, Math.max(control.min ?? value, value));
  }
}

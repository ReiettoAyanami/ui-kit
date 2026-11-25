import { Component, input, model, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { LenziColorPicker } from '@lenzi/ui-kit';

import { Control, Values } from '../../registry';
import { LenziGlassSegmented, LenziGlassSlider, LenziGlassSwitch, LenziLit, lenziOverBackground } from '@lenzi/ui-kit/backgrounds';

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
  imports: [LenziColorPicker, LenziGlassSegmented, LenziGlassSlider, LenziGlassSwitch, LenziLit, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
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

  /**
   * A number typed in its field applies as it is typed (lenzi, 2026-11-21: "tanti input non si aggiornano
   * automaticamente"), once the field holds one the parameter takes. Not while it is half typed ("1.", "-": the field
   * says nothing), out of the range (it may be the start of one: the "1" of "15"), or written another way than the
   * number reads ("-0", ".5", "05"): the field shows the parameter, and would be written over under the typing.
   * Enter or leaving the field settles it.
   */
  protected typed(field: HTMLInputElement, control: Control): void {
    const value = field.valueAsNumber;
    if (field.value === '' || !Number.isFinite(value) || String(value) !== field.value) return;
    if (value < (control.min ?? -Infinity) || value > (control.max ?? Infinity)) return;
    this.set(control.key, value);
  }

  /**
   * Enter, or the field left: its number within the range, and the field shows it. Written here too: the number is
   * often the one already applied while it was typed (90 of "900"), and then nothing writes the field again.
   */
  protected settle(field: HTMLInputElement, control: Control): void {
    const value = this.number(field.value, control, Number(this.values()[control.key] ?? control.default));
    this.set(control.key, value);
    field.value = String(value);
  }

  /**
   * A field's number within the range; empty or not a number, the one it had (`Number('')` is 0: an emptied field became
   * the range's least, 2026-11-21).
   */
  protected number(text: string, control: Control, had: number): number {
    const value = text.trim() === '' ? Number.NaN : Number(text);
    if (!Number.isFinite(value)) return had;
    return Math.min(control.max ?? value, Math.max(control.min ?? value, value));
  }
}

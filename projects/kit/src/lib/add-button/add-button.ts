import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * The floating "+" (RULES.md, "Add button"): a Material FAB at the bottom right of the screen, a
 * little larger than Material's. It only says it was pressed; whoever places it decides what opens.
 * From substance-tracker and vtiger-reader `ui/add-button` (the same in both).
 */
@Component({
  selector: 'lenzi-add-button',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './add-button.html',
  styleUrl: './add-button.css',
  host: { '[class.inline]': "placement() === 'inline'" },
})
export class LenziAddButton {
  /** What the button does, for screen readers, in whole words: "Add substance". */
  readonly label = input.required<string>();
  /**
   * fixed: at the bottom right of the screen, above the page (the only place in an app).
   * inline: where its host puts it (the catalog's demos).
   */
  readonly placement = input<'fixed' | 'inline'>('fixed');
  readonly pressed = output<void>();
}

import { Component, computed, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LenziIdentityColorPipe } from '@lenzi/ui-kit';

import { Values } from '../../registry';

/** A tooltip on one line and one on two, in the kit's dark glass. */
@Component({
  selector: 'app-tooltips-demo',
  imports: [LenziIdentityColorPipe, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './tooltips-demo.html',
  styleUrl: './tooltips-demo.css',
})
export class TooltipsDemo {
  readonly values = input<Values>({});
  protected readonly text = computed(() => String(this.values()['text'] ?? ''));
  protected readonly lines = computed(() => {
    const second = String(this.values()['second'] ?? '');
    return second ? `${this.text()}\n${second}` : this.text();
  });
}

import { Component, computed, input } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';

import { Values } from '../../registry';

/** A panel of a page, and a flat one inside a window; on a phone the header keeps only its title. */
@Component({
  selector: 'app-expansion-panels-demo',
  imports: [MatExpansionModule],
  templateUrl: './expansion-panels-demo.html',
  styleUrl: './expansion-panels-demo.css',
})
export class ExpansionPanelsDemo {
  readonly values = input<Values>({});
  protected readonly flat = computed(() => this.values()['flat'] === true);
  protected readonly description = computed(() => String(this.values()['description'] ?? ''));
}

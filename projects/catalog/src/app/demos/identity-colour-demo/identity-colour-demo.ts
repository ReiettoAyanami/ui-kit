import { Component, computed, input } from '@angular/core';

import { LenziIdentityDot, identityColor } from '@lenzi/ui-kit';

import { Values } from '../../registry';

/** The identity colours of the first ids: name bold on top, its colour under it. */
@Component({
  selector: 'app-identity-colour-demo',
  imports: [LenziIdentityDot],
  templateUrl: './identity-colour-demo.html',
  styleUrl: './identity-colour-demo.css',
})
export class IdentityColourDemo {
  readonly values = input<Values>({});
  protected readonly offset = computed(() => Number(this.values()['offset'] ?? 0));
  protected readonly ids = computed(() => {
    const count = Number(this.values()['count'] ?? 12);
    return Array.from({ length: count }, (_, i) => ({ id: i + 1, color: identityColor(i + 1, this.offset()) }));
  });
}

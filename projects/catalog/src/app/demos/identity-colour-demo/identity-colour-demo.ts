import { Component, computed, input, signal } from '@angular/core';

import { identityColor } from '@lenzi/ui-kit';

import { ColorSwatch } from '../../shared/color-swatch/color-swatch';
import { Values } from '../../registry';

/**
 * The identity colours of the first ids: name bold on top, its colour under it. They are computed and
 * frozen; a click on a dot opens a colour selector to try a colour of one's own (`[color]` of
 * LenziIdentityDot, for something that has no id).
 */
@Component({
  selector: 'app-identity-colour-demo',
  imports: [ColorSwatch],
  templateUrl: './identity-colour-demo.html',
  styleUrl: './identity-colour-demo.css',
})
export class IdentityColourDemo {
  readonly values = input<Values>({});
  protected readonly offset = computed(() => Number(this.values()['offset'] ?? 0));
  /** Colours picked by hand, by id. */
  protected readonly chosen = signal<Partial<Record<number, string>>>({});
  protected readonly ids = computed(() => {
    const count = Number(this.values()['count'] ?? 12);
    const chosen = this.chosen();
    return Array.from({ length: count }, (_, i) => {
      const id = i + 1;
      const entry: { id: number; computed: string; chosen: string | null } = { id, computed: identityColor(id, this.offset()), chosen: chosen[id] ?? null };
      return entry;
    });
  });

  protected pick(id: number, hex: string): void {
    this.chosen.update((chosen) => ({ ...chosen, [id]: hex }));
  }

  protected forget(id: number): void {
    this.chosen.update(({ [id]: _gone, ...rest }) => rest);
  }
}

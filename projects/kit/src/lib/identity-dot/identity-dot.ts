import { Component, computed, input } from '@angular/core';

import { IdentityOffset, identityColor } from './identity-color';

/**
 * The identity dot (RULES.md, "Identity colours"): a small filled circle in an entity's identity
 * colour, next to its name, so the same thing is the same colour everywhere (a list, a card, a
 * chart's chip, a segment of a bar). Decoration: screen readers skip it, the name says what it is.
 */
@Component({
  selector: 'lenzi-identity-dot',
  imports: [],
  templateUrl: './identity-dot.html',
  styleUrl: './identity-dot.css',
  host: {
    'aria-hidden': 'true',
    '[style.background-color]': 'shownColor()',
  },
})
export class LenziIdentityDot {
  /** The entity's id: its colour comes from it. */
  readonly id = input<number | null>(null);
  /** Where this kind of entity starts in the band (0, or 0.5 for a second kind with its own ids). */
  readonly offset = input<IdentityOffset>(0);
  /** A colour of its own instead (a CSS colour): something that has no id, like "One-time". */
  readonly color = input<string | null>(null);

  protected readonly shownColor = computed(() => {
    const color = this.color();
    if (color) return color;
    const id = this.id();
    return id === null ? 'var(--mat-sys-outline)' : identityColor(id, this.offset());
  });
}

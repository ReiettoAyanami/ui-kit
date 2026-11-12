import { Component, booleanAttribute, computed, input } from '@angular/core';

/**
 * What a list or a panel says instead of its content (RULES.md, "Empty, loading, failed"): "…"
 * while it loads, a short sentence when there is nothing ("No substances"), and why it failed
 * ("Could not load the substances: Not found (404)", see couldNotLoad()), so a failure is never a
 * blank page. Shown only once the answer is known: an empty list is not "empty" while it loads.
 */
@Component({
  selector: 'lenzi-status-message',
  imports: [],
  templateUrl: './status-message.html',
  styleUrl: './status-message.css',
  host: {
    '[attr.role]': "kind() === 'error' ? 'alert' : 'status'",
    '[class.error]': "kind() === 'error'",
    '[class.compact]': 'compact()',
  },
})
export class LenziStatusMessage {
  readonly kind = input<'loading' | 'empty' | 'error'>('empty');
  /** What it says; while loading, "…" when not given. */
  readonly text = input<string>('');
  /** Inside a list or a panel, with less room around it than in a card (16 px instead of 48). */
  readonly compact = input(false, { transform: booleanAttribute });

  protected readonly shown = computed(() => this.text() || (this.kind() === 'loading' ? '…' : ''));
}

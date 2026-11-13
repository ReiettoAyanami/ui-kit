import { Component, computed, inject, input } from '@angular/core';

import { KitServer } from '../kit-server';

/**
 * What whoever changes something on the page should know about where the change goes. A visitor: that
 * it is theirs alone and gone at the next reload (`visitor`, said only where a visitor can change
 * something: the pages of the components). The admin: that this server saves the variables only,
 * where it does not change the kit's files. Nothing otherwise, or while it is not known who is looking.
 */
@Component({
  selector: 'app-save-hint',
  imports: [],
  templateUrl: './save-hint.html',
  styleUrl: './save-hint.css',
})
export class SaveHint {
  /** What would be saved: the variables, or files of the kit (code, documents). */
  readonly what = input.required<'variables' | 'files'>();
  /** The sentence for a visitor; none where a visitor changes nothing. */
  readonly visitor = input<string | null>(null);

  private readonly server = inject(KitServer);

  protected readonly text = computed<string | null>(() => {
    const session = this.server.session();
    if (!session) return null;
    if (!session.signedIn) return this.visitor();
    return this.what() === 'files' && !session.files
      ? "This server saves the variables only. The kit's files change on the development server (npm start), and a new build shows them."
      : null;
  });
}

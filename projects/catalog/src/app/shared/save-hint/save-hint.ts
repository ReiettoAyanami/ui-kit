import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { KitServer } from '../kit-server';

/**
 * Why what is on the page cannot be saved into the kit from this browser, and what to do about it: no
 * admin on this server, not signed in (with the way to the Admin page), or a server that changes the
 * variables only. Nothing when it can be saved, or while that is not known yet.
 */
@Component({
  selector: 'app-save-hint',
  imports: [RouterLink],
  templateUrl: './save-hint.html',
  styleUrl: './save-hint.css',
})
export class SaveHint {
  /** What would be saved: the variables, or files of the kit (code, documents). */
  readonly what = input.required<'variables' | 'files'>();
  /** Where the changes stay meanwhile: "in this browser", "on this page". */
  readonly kept = input('in this browser');

  private readonly server = inject(KitServer);

  protected readonly reason = computed<'no-admin' | 'sign-in' | 'no-files' | null>(() => {
    const session = this.server.session();
    if (!session) return null;
    if (session.signedIn) return this.what() === 'files' && !session.files ? 'no-files' : null;
    if (this.what() === 'files' && session.configured && !session.files) return 'no-files';
    return session.configured ? 'sign-in' : 'no-admin';
  });
}

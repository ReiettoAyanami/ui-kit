import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Observable, from, isObservable } from 'rxjs';

import { describeError } from '../util/describe-error';

/** What the confirmation asks and does. */
export interface LenziConfirmData {
  /** A question: "Delete this consumption?", "Sign out?". */
  title: string;
  /** What confirming costs, in a sentence or two: "Its consumptions are deleted too." */
  message: string;
  /** The label of the button that confirms, a whole word: "Delete", "Sign out". */
  confirm: string;
  /** The label of the button that does not: "Cancel" when not given. */
  cancel?: string;
  /** A destructive action (the default): the button in the error colour. Signing out is not one. */
  destructive?: boolean;
  /** What confirming does (a request): the dialog waits for it, closes on success, says why on a failure. */
  action: () => Observable<unknown> | Promise<unknown>;
}

/**
 * Asks before an action and runs it (RULES.md, "Dialogs"; substance-tracker: Delete, Sign out).
 * Closes with `true` once the action succeeded, with nothing on Cancel; on an error it stays open
 * and says why (the API's detail and status). The confirm button is disabled while the action runs:
 * no double submit. Open it with LenziDialogs, so the back button closes it.
 */
@Component({
  selector: 'lenzi-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class LenziConfirmDialog {
  protected readonly data = inject<LenziConfirmData>(MAT_DIALOG_DATA);
  private readonly dialog = inject<MatDialogRef<LenziConfirmDialog, true>>(MatDialogRef);

  /** The action is running: the button is disabled (no double submit). */
  protected readonly running = signal(false);
  protected readonly error = signal<string | null>(null);

  protected confirm(): void {
    // The guard, not only the disabled button: a second tap can arrive before the view updates.
    if (this.running()) return;
    this.running.set(true);
    this.error.set(null);
    const answer = this.data.action();
    let closed = false;
    const succeed = () => {
      if (closed) return;
      closed = true;
      this.dialog.close(true);
    };
    (isObservable(answer) ? answer : from(answer)).subscribe({
      next: succeed,
      // An action that completes without a value (an empty Observable) is a success too.
      complete: succeed,
      error: (error: unknown) => {
        this.running.set(false);
        this.error.set(describeError(error));
      },
    });
  }

  protected cancel(): void {
    this.dialog.close();
  }
}

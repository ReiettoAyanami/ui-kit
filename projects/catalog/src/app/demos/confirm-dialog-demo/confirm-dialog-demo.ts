import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { delay, of, throwError, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { KitConfirmData, KitConfirmDialog, KitDialogs } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** Asks, runs the action, closes on success or says why it failed; the back button closes it too. */
@Component({
  selector: 'app-confirm-dialog-demo',
  imports: [MatButtonModule],
  templateUrl: './confirm-dialog-demo.html',
  styleUrl: './confirm-dialog-demo.css',
})
export class ConfirmDialogDemo {
  readonly values = input<Values>({});
  private readonly dialogs = inject(KitDialogs);
  private readonly events = inject(DemoEvents);

  protected async ask(): Promise<void> {
    const values = this.values();
    const outcome = values['outcome'];
    const done = await this.dialogs.open<KitConfirmDialog, KitConfirmData, true>(
      KitConfirmDialog,
      {
        title: String(values['title']),
        message: String(values['message']),
        confirm: String(values['confirm']),
        destructive: values['destructive'] === true,
        action: () =>
          outcome === 'failure'
            ? timer(400).pipe(switchMap(() => throwError(() => ({ status: 409, title: 'Conflict', detail: 'Batch 8 is finished' }))))
            : of(true).pipe(delay(outcome === 'slow' ? 2000 : 300)),
      },
      { width: '400px' },
    );
    this.events.log(done ? 'done: the action succeeded' : 'cancelled');
  }
}

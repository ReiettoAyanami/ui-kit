import { Component, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { LenziDialogs } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';
import { NameDialog, NameDialogData } from './name-dialog';

/** A form in a dialog, opened with LenziDialogs: the back button (or the phone's back gesture) closes it. */
@Component({
  selector: 'app-dialogs-demo',
  imports: [MatButtonModule],
  templateUrl: './dialogs-demo.html',
  styleUrl: './dialogs-demo.css',
})
export class DialogsDemo {
  readonly values = input<Values>({});
  private readonly dialogs = inject(LenziDialogs);
  private readonly events = inject(DemoEvents);

  protected readonly name = signal('Peroni 6-pack');

  protected async rename(): Promise<void> {
    const raised = this.values()['raised'] === true;
    const name = await this.dialogs.open<NameDialog, NameDialogData, string>(
      NameDialog,
      { name: this.name() },
      raised ? { panelClass: 'lenzi-dialog-raised' } : {},
    );
    if (name === undefined) {
      this.events.log('closed with nothing: Cancel, the back, Escape or a click outside');
      return;
    }
    this.name.set(name);
    this.events.log(`saved: ${name}`);
  }
}

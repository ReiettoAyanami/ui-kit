import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/** What the demo's dialog is given: the name it changes. */
export interface NameDialogData {
  name: string;
}

/** A small form in a dialog, opened with LenziDialogs: Save closes it with the new name, Cancel with nothing. */
@Component({
  selector: 'app-name-dialog',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  templateUrl: './name-dialog.html',
  styleUrl: './name-dialog.css',
})
export class NameDialog {
  private readonly data = inject<NameDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<NameDialog, string>>(MatDialogRef);

  protected readonly name = signal(this.data.name);
  /** Save was tapped: disabled from then on (no double submit). */
  protected readonly saving = signal(false);

  protected save(): void {
    const name = this.name().trim();
    if (!name || this.saving()) return;
    this.saving.set(true);
    this.ref.close(name);
  }
}

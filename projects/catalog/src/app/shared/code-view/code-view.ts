import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';

import { LenziStatusMessage, couldNotLoad } from '@lenzi/ui-kit';

import { highlight, languageOf } from '../highlight';
import { KitFiles } from '../kit-files';

/**
 * The real code of a piece of the kit, file by file, as it is on disk: what lenzi reads, what
 * Claude uses. A pill per file, the code coloured, a button to copy it.
 */
@Component({
  selector: 'app-code-view',
  imports: [LenziStatusMessage, MatButtonModule, MatButtonToggleModule, MatIconModule],
  templateUrl: './code-view.html',
  styleUrl: './code-view.css',
})
export class CodeView {
  /** The files, relative to projects/kit. */
  readonly files = input.required<readonly string[]>();

  private readonly kitFiles = inject(KitFiles);

  protected readonly chosen = linkedSignal(() => this.files()[0] ?? '');
  protected readonly copied = signal(false);

  protected readonly file = rxResource({
    params: () => this.chosen(),
    stream: ({ params }) => this.kitFiles.text(params),
  });

  protected readonly coloured = computed(() => (this.file.hasValue() ? highlight(this.file.value(), languageOf(this.chosen())) : ''));
  protected readonly failure = computed(() => (this.file.error() ? couldNotLoad(this.chosen(), this.file.error()) : null));

  protected name(path: string): string {
    return path.split('/').pop() ?? path;
  }

  protected async copy(): Promise<void> {
    if (!this.file.hasValue()) return;
    await navigator.clipboard?.writeText(this.file.value());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}

import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { firstValueFrom } from 'rxjs';

import { LenziStatusMessage, couldNotLoad, describeError } from '@lenzi/ui-kit';

import { CodeEditor } from '../code-editor/code-editor';
import { KitFiles } from '../kit-files';
import { KitServer } from '../kit-server';
import { Markdown } from '../markdown/markdown';
import { SaveHint } from '../save-hint/save-hint';

/**
 * A document of the kit (RULES.md, AI-RULES.md, a piece's README.md and AI.md), to read and, for the
 * admin, to change (lenzi, 2026-11-12: "rules, ai notes, code devono essere modificabili"): a toggle at the
 * top, Read or Edit. Edit shows the Markdown in an editor; Read shows the draft as it reads, so a
 * change is seen at once. "Save to the kit" writes the file (the admin, on the development server); "Discard" goes back.
 */
@Component({
  selector: 'app-doc-view',
  imports: [CodeEditor, LenziStatusMessage, Markdown, MatButtonModule, MatButtonToggleModule, SaveHint],
  templateUrl: './doc-view.html',
  styleUrl: './doc-view.css',
})
export class DocView {
  /** The file, relative to projects/kit. */
  readonly path = input.required<string>();
  /** What the document is: "the rules", "the AI notes" (the messages say it). */
  readonly what = input('the document');

  private readonly files = inject(KitFiles);
  protected readonly server = inject(KitServer);

  /**
   * Only the admin has the Edit side (lenzi, 2026-11-13: "the public shouldn't see the edit buttons";
   * on a component's page too: "vedo ancora i tasti edit e non edit"). A visitor reads.
   */
  protected readonly canEdit = this.server.admin;
  private readonly chosen = signal<'read' | 'edit'>('read');
  protected readonly mode = computed(() => (this.canEdit() ? this.chosen() : 'read'));

  protected choose(mode: 'read' | 'edit'): void {
    this.chosen.set(mode);
  }
  private readonly file = rxResource({ params: () => this.path(), stream: ({ params }) => this.files.text(params) });
  protected readonly draft = linkedSignal(() => (this.file.hasValue() ? this.file.value() : null));
  protected readonly changed = computed(() => this.file.hasValue() && this.draft() !== null && this.draft() !== this.file.value());
  protected readonly failure = computed(() => (this.file.error() ? couldNotLoad(this.what(), this.file.error()) : null));
  protected readonly saving = signal(false);
  protected readonly message = signal<string | null>(null);

  protected edited(text: string): void {
    this.draft.set(text);
    this.message.set(null);
  }

  protected discard(): void {
    if (this.file.hasValue()) this.draft.set(this.file.value());
    this.message.set(null);
  }

  protected async save(): Promise<void> {
    const text = this.draft();
    if (this.saving() || !this.changed() || text === null) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.server.saveFile(this.path(), text));
      this.files.remember(this.path(), text);
      this.file.reload();
      this.message.set(`Saved into the kit: projects/kit/${this.path()}.`);
    } catch (error) {
      this.message.set(`Not saved: ${describeError(error)}`);
    } finally {
      this.saving.set(false);
    }
  }
}

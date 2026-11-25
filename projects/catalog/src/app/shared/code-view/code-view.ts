import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';

import { LenziStatusMessage, couldNotLoad, describeError } from '@lenzi/ui-kit';

import { CodeEditor } from '../code-editor/code-editor';
import { languageOf } from '../highlight';
import { KitFiles } from '../kit-files';
import { KitServer } from '../kit-server';
import { SaveHint } from '../save-hint/save-hint';
import { LenziGlassOption, LenziGlassSegmented } from '@lenzi/ui-kit/backgrounds';

/**
 * The real code of a piece of the kit, file by file, as it is on disk, in an editor (lenzi,
 * 2026-11-12: "everything that involves code/configuration file must be put into a code-like textarea
 * where the user can edit, and they will take effect"). For the admin on the development server, "Save to the
 * kit" writes the file and the catalog rebuilds with it: the demo shows the change. Elsewhere it can
 * be read and copied. A file changed and not saved keeps its draft while another file is open.
 */
@Component({
  selector: 'app-code-view',
  imports: [CodeEditor, LenziGlassSegmented, LenziStatusMessage, MatButtonModule, MatIconModule, SaveHint],
  templateUrl: './code-view.html',
  styleUrl: './code-view.css',
})
export class CodeView {
  /** The files, relative to projects/kit. */
  readonly files = input.required<readonly string[]>();

  private readonly kitFiles = inject(KitFiles);
  protected readonly server = inject(KitServer);

  protected readonly chosen = linkedSignal(() => this.files()[0] ?? '');
  /** What was typed and not saved, by file. */
  protected readonly drafts = signal<Record<string, string>>({});
  protected readonly copied = signal(false);
  protected readonly saving = signal(false);
  protected readonly message = signal<string | null>(null);

  protected readonly file = rxResource({
    params: () => this.chosen(),
    stream: ({ params }) => this.kitFiles.text(params),
  });

  protected readonly text = computed(() => this.drafts()[this.chosen()] ?? (this.file.hasValue() ? this.file.value() : ''));
  /** The files as choices; one changed and not saved has a "*" after its name, as in an editor. */
  protected readonly fileOptions = computed<readonly LenziGlassOption[]>(() =>
    this.files().map((path) => ({ value: path, label: this.name(path) + (path in this.drafts() ? ' *' : '') })),
  );
  protected readonly changed = computed(() => this.chosen() in this.drafts());
  protected readonly language = computed(() => languageOf(this.chosen()));
  protected readonly failure = computed(() => (this.file.error() ? couldNotLoad(this.chosen(), this.file.error()) : null));

  protected name(path: string): string {
    return path.split('/').pop() ?? path;
  }

  protected choose(path: string): void {
    this.chosen.set(path);
    this.message.set(null);
  }

  protected edited(text: string): void {
    const path = this.chosen();
    const original = this.file.hasValue() ? this.file.value() : null;
    this.drafts.update((drafts) => {
      const { [path]: _old, ...rest } = drafts;
      return text === original ? rest : { ...rest, [path]: text };
    });
    this.message.set(null);
  }

  protected discard(): void {
    const path = this.chosen();
    this.drafts.update(({ [path]: _gone, ...rest }) => rest);
    this.message.set(null);
  }

  protected async save(): Promise<void> {
    const path = this.chosen();
    const text = this.drafts()[path];
    if (this.saving() || text === undefined) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.server.saveFile(path, text));
      this.kitFiles.remember(path, text);
      this.drafts.update(({ [path]: _saved, ...rest }) => rest);
      this.file.reload();
      this.message.set('Saved into the kit: the catalog is rebuilding with it.');
    } catch (error) {
      this.message.set(`Not saved: ${describeError(error)}`);
    } finally {
      this.saving.set(false);
    }
  }

  protected async copy(): Promise<void> {
    await navigator.clipboard?.writeText(this.text());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}

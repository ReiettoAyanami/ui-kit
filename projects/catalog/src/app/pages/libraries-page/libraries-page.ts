import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';

import { LenziFigure, LenziFigureGrid, LenziStatusMessage, couldNotLoad, describeError } from '@lenzi/ui-kit';

import { CodeEditor } from '../../shared/code-editor/code-editor';
import { KitFiles } from '../../shared/kit-files';
import { KitServer } from '../../shared/kit-server';
import { SaveHint } from '../../shared/save-hint/save-hint';
import { GlassPage } from '../../shared/glass-page/glass-page';
import { LenziLit } from '@lenzi/ui-kit/backgrounds';
import { overBackground } from '../../shared/current-background';

interface Library {
  name: string;
  package: string;
  url: string;
  role: string;
  rules: string[];
  versions: Partial<Record<string, string>>;
}

interface Libraries {
  about: string;
  projects: string[];
  groups: { id: string; label: string; libraries: Library[] }[];
}

/**
 * Every frontend library of lenzi's apps (projects/kit/libraries.json): what it is for, its rules,
 * and the version each project has. A library that is not here is not used.
 */
@Component({
  selector: 'app-libraries-page',
  imports: [CodeEditor, GlassPage, LenziFigure, LenziFigureGrid, LenziLit, LenziStatusMessage, MatButtonModule, MatExpansionModule, MatIconModule, SaveHint],
  templateUrl: './libraries-page.html',
  styleUrl: './libraries-page.css',
})
export class LibrariesPage {
  /** Over a background its surfaces are lit, solid without one (RULES.md, 2026-11-17). */
  protected readonly lit = overBackground();

  private readonly files = inject(KitFiles);

  protected readonly server = inject(KitServer);

  /** The file as text, what the editor shows; the page is drawn from it, as typed. */
  private readonly file = rxResource({ stream: () => this.files.text('libraries.json') });
  protected readonly source = linkedSignal(() => (this.file.hasValue() ? this.file.value() : ''));

  private readonly parse = computed<{ data: Libraries | null; error: string | null }>(() => {
    const text = this.source();
    if (!text) return { data: null, error: null };
    try {
      return { data: JSON.parse(text) as Libraries, error: null };
    } catch (error) {
      return { data: null, error: (error as Error).message };
    }
  });
  /** What the page shows: the last valid text, while the one being typed is not JSON. */
  protected readonly shown = linkedSignal<{ data: Libraries | null; error: string | null }, Libraries | null>({
    source: this.parse,
    computation: (now, before) => now.data ?? before?.value ?? null,
  });
  protected readonly jsonError = computed(() => this.parse().error);
  protected readonly changed = computed(() => this.file.hasValue() && this.source() !== this.file.value());
  protected readonly saving = signal(false);
  protected readonly message = signal<string | null>(null);

  protected discard(): void {
    if (this.file.hasValue()) this.source.set(this.file.value());
    this.message.set(null);
  }

  protected async save(): Promise<void> {
    if (this.saving() || !this.changed() || this.jsonError()) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.server.saveFile('libraries.json', this.source()));
      this.files.remember('libraries.json', this.source());
      this.file.reload();
      this.message.set('Saved into the kit: projects/kit/libraries.json.');
    } catch (error) {
      this.message.set(`Not saved: ${describeError(error)}`);
    } finally {
      this.saving.set(false);
    }
  }
  protected readonly failure = computed(() => (this.file.error() ? couldNotLoad('the libraries', this.file.error()) : null));

  /** The texts' `code` as code; everything else as text (escaped). */
  protected inline(text: string): string {
    const escaped = text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
    return escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
  }
}

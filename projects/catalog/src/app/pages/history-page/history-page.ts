import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { tap } from 'rxjs';

import { LenziConfirmData, LenziConfirmDialog, LenziDialogs, LenziFigure, LenziStatusMessage, couldNotLoad, keptValue } from '@lenzi/ui-kit';

import { KitSave, KitServer } from '../../shared/kit-server';
import { LiveTokens, VariableChange } from '../../shared/live-tokens';
import { SaveHint } from '../../shared/save-hint/save-hint';
import { TokenDef, TokensApi } from '../../shared/tokens-api';

const WHEN = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const SHOWN = 20;

/** A value of a variable as a figure shows it. */
interface Shown {
  text: string;
  /** The colour itself, when the variable is one. */
  color: string | null;
}

/**
 * What was changed, and the way back from each change (lenzi, 2026-11-12: "Aggiungi anche pagina di
 * history delle modifiche"), in three parts: what differs now from the kit in this browser; what was
 * changed in this browser, change by change; what was saved into the kit, kept by the server, which
 * the admin can undo.
 */
@Component({
  selector: 'app-history-page',
  imports: [LenziFigure, LenziStatusMessage, MatButtonModule, MatIconModule, SaveHint],
  templateUrl: './history-page.html',
  styleUrl: './history-page.css',
})
export class HistoryPage {
  private readonly api = inject(TokensApi);
  private readonly dialogs = inject(LenziDialogs);
  private readonly snackBar = inject(MatSnackBar);
  private readonly live = inject(LiveTokens);
  protected readonly server = inject(KitServer);

  private readonly tokens = rxResource({ stream: () => this.api.load() });
  private readonly byName = computed(() => {
    const all = new Map<string, TokenDef>();
    if (this.tokens.hasValue()) for (const group of this.tokens.value().groups) for (const token of group.tokens) all.set(token.name, token);
    return all;
  });

  // 1. Now, in this browser.
  protected readonly different = computed(() =>
    Object.entries(this.live.overrides()).map(([name, value]) => ({ name, label: this.label(name), kit: this.shown(name, this.byName().get(name)?.value ?? null), now: this.shown(name, value) })),
  );

  // 2. Changed in this browser, the newest first.
  protected readonly logLimit = signal(SHOWN);
  private readonly log = computed(() => [...this.live.log()].reverse());
  protected readonly logCount = computed(() => this.log().length);
  protected readonly changes = computed(() =>
    this.log()
      .slice(0, this.logLimit())
      .map((change) => ({
        change,
        label: this.label(change.name),
        from: this.shown(change.name, change.from, change.kit),
        to: this.shown(change.name, change.to, change.kit),
        when: WHEN.format(change.at),
        // already there: nothing to go back to
        current: (this.live.overrides()[change.name] ?? null) === change.from,
      })),
  );

  // 3. Saved into the kit.
  private readonly saves = rxResource({ stream: () => this.server.history() });
  private readonly keptSaves = keptValue(this.saves);
  protected readonly savesFailure = computed(() => (this.saves.error() ? couldNotLoad('the saves', this.saves.error()) : null));
  protected readonly savesLimit = signal(SHOWN);
  protected readonly savesCount = computed(() => this.keptSaves()?.length ?? 0);
  protected readonly kitSaves = computed(() => {
    const saves = this.keptSaves();
    if (!saves) return null;
    return saves.slice(0, this.savesLimit()).map((save) => ({
      save,
      title: this.title(save),
      when: WHEN.format(new Date(save.at)),
      changes: (save.changes ?? []).map((change) => ({
        name: change.name,
        label: this.label(change.name),
        from: this.shown(change.name, change.from),
        to: this.shown(change.name, change.to),
      })),
      size: save.kind === 'file' ? { before: this.bytes(save.bytesBefore ?? 0), after: this.bytes(save.bytesAfter ?? 0) } : null,
      // a file is undone only where the server changes files
      canUndo: this.server.canSaveVariables() === true && (save.kind === 'variables' || this.server.canSave() === true),
    }));
  });

  private label(name: string): string {
    return this.byName().get(name)?.label ?? name;
  }

  /** A value, or the kit's own when there is none (`kit`: what it was then, when that is known). */
  private shown(name: string, value: string | null, kit: string | null = null): Shown {
    const token = this.byName().get(name);
    const text = value ?? kit ?? token?.value ?? null;
    const isColor = token ? token.type === 'color' : /^#[0-9a-f]{6,8}$/i.test(text ?? '');
    if (text === null) return { text: "The kit's value", color: null };
    return { text: value === null ? `${text} (the kit's)` : text, color: isColor ? text : null };
  }

  private title(save: KitSave): string {
    if (save.kind === 'file') return save.restores ? `${save.path}, a save undone` : (save.path ?? 'A file');
    const count = save.changes?.length ?? 0;
    const what = count === 1 ? this.label(save.changes![0]!.name) : `${count} variables`;
    return save.restores ? `${what}, a save undone` : what;
  }

  private bytes(count: number): string {
    return count < 1024 ? `${count} bytes` : `${(count / 1024).toFixed(1)} kB`;
  }

  /** Back to the kit's value, in this browser. */
  protected backToKit(name: string): void {
    this.live.reset(name);
  }

  protected discardAll(): void {
    this.live.clear();
  }

  /** Back to what the variable was before this change. */
  protected goBack(change: VariableChange): void {
    if (change.from === null) this.live.reset(change.name);
    else this.live.set(change.name, change.from);
  }

  protected clearLog(): void {
    this.live.clearLog();
    this.logLimit.set(SHOWN);
  }

  /** Undoing a save writes into the kit: it asks first. */
  protected async undo(save: KitSave, title: string): Promise<void> {
    const undone = await this.dialogs.open<LenziConfirmDialog, LenziConfirmData, true>(LenziConfirmDialog, {
      title: `Undo the save of ${title}?`,
      message:
        save.kind === 'file'
          ? 'The file goes back to the text it had before this save. What was saved into it after is replaced.'
          : 'The variables of this save go back to what they were before it, for everyone.',
      confirm: 'Undo the save',
      action: () =>
        this.server.restore(save.id).pipe(
          tap(() => {
            // the kit changed: its values and its saves are read again, here and on every page
            void this.live.kitChanged();
            this.tokens.reload();
            this.saves.reload();
          }),
        ),
    });
    if (undone) this.snackBar.open(save.kind === 'file' ? 'The file is back as it was' : 'The variables are back as they were', 'OK', { duration: 5000 });
  }
}

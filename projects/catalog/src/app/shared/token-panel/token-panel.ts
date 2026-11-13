import { Component, booleanAttribute, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';

import { LenziColorPicker, describeError, readPreference, writePreference } from '@lenzi/ui-kit';

import { KitServer } from '../kit-server';
import { LiveTokens } from '../live-tokens';
import { SaveHint } from '../save-hint/save-hint';
import { tokensToCss } from '../token-css';
import { TokenEditor } from '../token-editor/token-editor';
import { TokenDef, TokenGroup, TokensApi } from '../tokens-api';

/** The easing curves offered by name; any other is kept as written (and editable as text). */
const EASINGS = [
  { value: 'cubic-bezier(0.05, 0.7, 0.1, 1)', label: 'emphasized decelerate' },
  { value: 'cubic-bezier(0.2, 0, 0, 1)', label: 'standard' },
  { value: 'cubic-bezier(0.3, 0, 0.8, 0.15)', label: 'emphasized accelerate' },
  { value: 'linear', label: 'linear' },
  { value: 'ease-out', label: 'ease-out' },
];

const MODE_KEY = 'kit-catalog.variables-mode';

/** "56%" → 56 and "%"; "24px" → 24 and "px"; "300ms" → 300 and "ms". */
function split(value: string): { number: number; unit: string } {
  const match = /^(-?\d+(?:\.\d+)?)(%|px|ms)?$/.exec(value.trim());
  return match ? { number: Number(match[1]), unit: match[2] ?? '' } : { number: 0, unit: '' };
}

/**
 * Global variables, each with its own control (lenzi, 2026-11-12: "ogni variabile ha il suo toggle
 * giusto"): a slider with its unit, a colour picker, a curve; what it is for and why it has its value. A
 * toggle at the top turns them into CSS text to edit (`Controls | Text`). Every change applies at once,
 * here and in every demo; "Save to the kit" (the admin, signed in) writes them into the kit,
 * "Discard" goes back. The Variables page shows all of them (the admin changes them there, a visitor
 * reads them), a piece's Variables tab the ones its styles read (a visitor may try them there).
 */
@Component({
  selector: 'app-token-panel',
  imports: [LenziColorPicker, MatButtonModule, MatButtonToggleModule, MatIconModule, MatSelectModule, MatSliderModule, MatTooltipModule, SaveHint, TokenEditor],
  templateUrl: './token-panel.html',
  styleUrl: './token-panel.css',
})
export class TokenPanel {
  readonly groups = input.required<readonly TokenGroup[]>();
  /** What the editor is called, for a screen reader. */
  readonly label = input('Variables');
  /** The bar with the changes sticks under the top bar while the variables scroll. */
  readonly sticky = input(false, { transform: booleanAttribute });
  /**
   * A visitor may change them too, for themselves and until the page is reloaded (lenzi, 2026-11-13:
   * "enable the edit (in browser) just for the components"): a piece's Variables tab. Without it only the
   * admin changes them (the Variables page), and a visitor reads their values.
   */
  readonly publicEdit = input(false, { transform: booleanAttribute });
  /** Saved: the host reads the variables again. */
  readonly saved = output<void>();

  private readonly live = inject(LiveTokens);
  private readonly api = inject(TokensApi);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly server = inject(KitServer);

  protected readonly canEdit = computed(() => this.publicEdit() || this.server.admin());

  /** Controls or text: this browser remembers which. */
  protected readonly mode = signal(readPreference<'controls' | 'text'>(MODE_KEY, (v) => (v === 'controls' || v === 'text' ? v : null), 'controls'));
  protected readonly easings = EASINGS;
  protected readonly saving = signal(false);
  protected readonly message = signal<string | null>(null);

  private readonly tokens = computed<TokenDef[]>(() => this.groups().flatMap((group) => group.tokens));
  /** The changes not saved among these variables. */
  protected readonly changed = computed(() => {
    const overrides = this.live.overrides();
    return this.tokens().filter((token) => token.name in overrides);
  });

  protected choose(mode: 'controls' | 'text'): void {
    this.mode.set(mode);
    writePreference(MODE_KEY, mode);
  }

  protected value(token: TokenDef): string {
    return this.live.overrides()[token.name] ?? token.value;
  }

  protected isChanged(token: TokenDef): boolean {
    return token.name in this.live.overrides();
  }

  protected numberOf(token: TokenDef): number {
    return split(this.value(token)).number;
  }

  protected isNumeric(token: TokenDef): boolean {
    return token.type === 'percent' || token.type === 'length' || token.type === 'time' || token.type === 'number';
  }

  protected easingKnown(value: string): boolean {
    return EASINGS.some((easing) => easing.value === value);
  }

  /** A new value: applied at once; the same as the saved one is no change. */
  protected set(token: TokenDef, value: string): void {
    if (!this.canEdit()) return;
    if (value === token.value) this.live.reset(token.name);
    else this.live.set(token.name, value);
    this.message.set(null);
  }

  protected setNumber(token: TokenDef, number: number | string): void {
    const parsed = Number(number);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.min(token.max ?? parsed, Math.max(token.min ?? parsed, parsed));
    this.set(token, `${clamped}${split(token.value).unit}`);
  }

  protected reset(token: TokenDef): void {
    this.live.reset(token.name);
  }

  protected discard(): void {
    for (const token of this.changed()) this.live.reset(token.name);
    this.message.set(null);
  }

  protected async save(): Promise<void> {
    const overrides = this.live.overrides();
    const values = Object.fromEntries(this.changed().map((token) => [token.name, overrides[token.name]!]));
    if (this.saving() || Object.keys(values).length === 0) return;
    this.saving.set(true);
    this.message.set(null);
    try {
      await firstValueFrom(this.api.save(values));
      await this.live.saved(Object.keys(values));
      this.snackBar.open('Saved into the kit', 'OK', { duration: 4000 });
      this.saved.emit();
    } catch (error) {
      this.message.set(`Not saved: ${describeError(error)}`);
    } finally {
      this.saving.set(false);
    }
  }

  protected async copyCss(): Promise<void> {
    const changed = this.changed();
    await navigator.clipboard?.writeText(tokensToCss([{ label: 'Changed', tokens: changed }], (token) => this.value(token)));
    this.snackBar.open('The changes, as CSS, are in the clipboard', 'OK', { duration: 3000 });
  }
}

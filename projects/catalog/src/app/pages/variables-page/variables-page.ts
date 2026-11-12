import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom, of } from 'rxjs';

import {
  KitConfirmDialog,
  KitDelta,
  KitPillOption,
  KitPillToggle,
  KitSearchBar,
  KitSegmentedBar,
  KitStatusMessage,
  couldNotLoad,
  describeError,
} from '@lenzi/ui-kit';

import { LiveTokens } from '../../shared/live-tokens';
import { TokenDef, TokensApi } from '../../shared/tokens-api';

/** The easing curves offered by name; any other is kept as written. */
const EASINGS = [
  { value: 'cubic-bezier(0.05, 0.7, 0.1, 1)', label: 'emphasized decelerate' },
  { value: 'cubic-bezier(0.2, 0, 0, 1)', label: 'standard' },
  { value: 'cubic-bezier(0.3, 0, 0.8, 0.15)', label: 'emphasized accelerate' },
  { value: 'linear', label: 'linear' },
  { value: 'ease-out', label: 'ease-out' },
];

/** "56%" → 56 and "%"; "24px" → 24 and "px"; "300ms" → 300 and "ms". */
function split(value: string): { number: number; unit: string } {
  const match = /^(-?\d+(?:\.\d+)?)(%|px|ms)?$/.exec(value.trim());
  return match ? { number: Number(match[1]), unit: match[2] ?? '' } : { number: 0, unit: '' };
}

/**
 * The global variables of the look (RULES.md, every value comes from them), one group at a time:
 * what each is, why it has the value it has (lenzi's words), and a control to change it. A change
 * applies at once, here and in every demo; "Save to the kit" writes them into tokens.json and
 * tokens.css (only the development server can: `npm start`), "Discard" goes back.
 */
@Component({
  selector: 'app-variables-page',
  imports: [
    KitDelta,
    KitPillToggle,
    KitSearchBar,
    KitSegmentedBar,
    KitStatusMessage,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
    MatSliderModule,
    MatTooltipModule,
  ],
  templateUrl: './variables-page.html',
  styleUrl: './variables-page.css',
})
export class VariablesPage {
  private readonly api = inject(TokensApi);
  private readonly live = inject(LiveTokens);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected readonly tokens = rxResource({ stream: () => this.api.load() });
  protected readonly overrides = this.live.overrides;
  protected readonly changed = computed(() => Object.keys(this.overrides()).length);
  protected readonly canSave = computed(() => this.tokens.hasValue() && this.tokens.value().canSave);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly failure = computed(() => (this.tokens.error() ? couldNotLoad('the variables', this.tokens.error()) : null));
  protected readonly easings = EASINGS;

  // The preview's own state.
  protected readonly measure = signal('price');
  protected readonly measures: KitPillOption<string>[] = [
    { value: 'price', label: 'price' },
    { value: 'qty', label: 'qty' },
  ];
  protected readonly segments = [
    { id: 1, value: 40, label: 'First batch', detail: '€1.20/bottiglia' },
    { id: 2, value: 25, label: 'Second batch', detail: '€1.05/bottiglia' },
    { id: 3, value: 10, label: 'Third batch', detail: '€0.98/bottiglia' },
  ];

  protected value(token: TokenDef): string {
    return this.overrides()[token.name] ?? token.value;
  }

  protected isChanged(token: TokenDef): boolean {
    return token.name in this.overrides();
  }

  protected numberOf(token: TokenDef): number {
    return split(this.value(token)).number;
  }

  protected unitOf(token: TokenDef): string {
    return split(token.value).unit;
  }

  protected isNumeric(token: TokenDef): boolean {
    return token.type === 'percent' || token.type === 'length' || token.type === 'time' || token.type === 'number';
  }

  protected easingName(value: string): string {
    return EASINGS.find((easing) => easing.value === value)?.label ?? value;
  }

  /** A new value: applied at once; the same as the saved one is no change. */
  protected set(token: TokenDef, value: string): void {
    if (value === token.value) this.live.reset(token.name);
    else this.live.set(token.name, value);
  }

  protected setNumber(token: TokenDef, number: number | string): void {
    const parsed = Number(number);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.min(token.max ?? parsed, Math.max(token.min ?? parsed, parsed));
    this.set(token, `${clamped}${this.unitOf(token)}`);
  }

  protected reset(token: TokenDef): void {
    this.live.reset(token.name);
  }

  protected discard(): void {
    this.live.clear();
    this.saveError.set(null);
  }

  protected async save(): Promise<void> {
    if (this.saving() || !this.changed()) return;
    this.saving.set(true);
    this.saveError.set(null);
    try {
      await firstValueFrom(this.api.save(this.overrides()));
      this.live.clear();
      this.tokens.reload();
      this.snackBar.open('Saved into the kit: tokens.json and tokens.css', 'OK', { duration: 4000 });
    } catch (error) {
      this.saveError.set(`Not saved: ${describeError(error)}`);
    } finally {
      this.saving.set(false);
    }
  }

  protected async copyCss(): Promise<void> {
    const lines = Object.entries(this.overrides()).map(([name, value]) => `  ${name}: ${value};`);
    await navigator.clipboard?.writeText(`:root {\n${lines.join('\n')}\n}\n`);
    this.snackBar.open('The changes, as CSS, are in the clipboard', 'OK', { duration: 3000 });
  }

  // Preview: the real windows, in the variables as they are now.
  protected openDialog(): void {
    this.dialog.open(KitConfirmDialog, {
      width: '400px',
      maxWidth: 'calc(100vw - 32px)',
      data: { title: 'Delete this consumption?', message: 'A window in the glass of the variables.', confirm: 'Delete', action: () => of(true) },
    });
  }

  protected showSnackbar(): void {
    this.snackBar.open('A snackbar rises from the bottom edge', 'OK', { duration: 3000 });
  }
}

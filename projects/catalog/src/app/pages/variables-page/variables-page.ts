import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';

import {
  LenziConfirmDialog,
  LenziDelta,
  LenziPillOption,
  LenziPillToggle,
  LenziSearchBar,
  LenziSegmentedBar,
  LenziStatusMessage,
  couldNotLoad,
} from '@lenzi/ui-kit';

import { KitServer } from '../../shared/kit-server';
import { TokenPanel } from '../../shared/token-panel/token-panel';
import { TokensApi } from '../../shared/tokens-api';
import { LenziGlassPage, LenziLit, lenziOverBackground } from '@lenzi/ui-kit/backgrounds';

/**
 * The global variables of the look (RULES.md, every value comes from them): every one with its control
 * or all of them as text (TokenPanel), next to a preview of real pieces in them. The admin changes
 * them here: a change applies at once, here and in every demo, and "Save to the kit" writes them into
 * the kit. A visitor reads them (and tries them on a component's page).
 */
@Component({
  selector: 'app-variables-page',
  imports: [
    LenziGlassPage,
    LenziDelta,
    LenziLit,
    LenziPillToggle,
    LenziSearchBar,
    LenziSegmentedBar,
    LenziStatusMessage,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatMenuModule,
    RouterLink,
    TokenPanel,
  ],
  templateUrl: './variables-page.html',
  styleUrl: './variables-page.css',
})
export class VariablesPage {
  /** Over a background its surfaces are lit, solid without one (RULES.md, 2026-11-17). */
  protected readonly lit = lenziOverBackground();

  private readonly api = inject(TokensApi);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  protected readonly server = inject(KitServer);

  protected readonly tokens = rxResource({ stream: () => this.api.load() });
  protected readonly failure = computed(() => (this.tokens.error() ? couldNotLoad('the variables', this.tokens.error()) : null));

  // The preview's own state.
  protected readonly measure = signal('price');
  protected readonly measures: LenziPillOption<string>[] = [
    { value: 'price', label: 'price' },
    { value: 'qty', label: 'qty' },
  ];
  protected readonly segments = [
    { id: 1, value: 40, label: 'First batch', detail: '€1.20/bottiglia' },
    { id: 2, value: 25, label: 'Second batch', detail: '€1.05/bottiglia' },
    { id: 3, value: 10, label: 'Third batch', detail: '€0.98/bottiglia' },
  ];

  // Preview: the real windows, in the variables as they are now.
  protected openDialog(): void {
    this.dialog.open(LenziConfirmDialog, {
      width: '400px',
      maxWidth: 'calc(100vw - 32px)',
      data: { title: 'Delete this consumption?', message: 'A window in the glass of the variables.', confirm: 'Delete', action: () => of(true) },
    });
  }

  protected showSnackbar(): void {
    this.snackBar.open('A snackbar rises from the bottom edge', 'OK', { duration: 3000 });
  }
}

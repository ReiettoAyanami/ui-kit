import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { LenziConfirmData, LenziConfirmDialog, LenziDialogs, LenziFigure, LenziFigureGrid, LenziStatusMessage, describeError } from '@lenzi/ui-kit';

import { KitServer } from '../../shared/kit-server';

/**
 * Where the catalog's one admin signs in (lenzi, 2026-11-12: "pagina admin per abilitare la modifica
 * (unico utente). L'endpoint pubblico mostra solo le info."). Signed out, the catalog shows the kit and
 * lets anyone try changes in their own browser; signed in, the changes are saved into the kit: the
 * variables everywhere, the kit's files where the server changes them. The user and the password are
 * the server's (its .env), never the catalog's.
 */
@Component({
  selector: 'app-admin-page',
  imports: [LenziFigure, LenziFigureGrid, LenziStatusMessage, MatButtonModule, MatFormFieldModule, MatInputModule, RouterLink],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.css',
})
export class AdminPage {
  private readonly dialogs = inject(LenziDialogs);
  protected readonly server = inject(KitServer);

  protected readonly user = signal('');
  protected readonly password = signal('');
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);

  /** What signing in changes on this server, in words. */
  protected readonly files = computed(() =>
    this.server.session()?.files
      ? 'Saved into the repo: code, rules, AI notes, libraries'
      : 'Read only here: they change on the development server, and a new build shows them',
  );

  protected async signIn(event: Event): Promise<void> {
    event.preventDefault();
    if (this.sending() || !this.user() || !this.password()) return;
    this.sending.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.server.signIn(this.user(), this.password()));
      this.password.set('');
    } catch (error) {
      this.error.set(describeError(error));
    } finally {
      this.sending.set(false);
    }
  }

  /** Signing out asks first (RULES.md), not destructive. */
  protected signOut(): void {
    void this.dialogs.open<LenziConfirmDialog, LenziConfirmData, true>(LenziConfirmDialog, {
      title: 'Sign out?',
      message: 'The catalog goes back to showing the kit: changes stay in this browser until you sign in again.',
      confirm: 'Sign out',
      destructive: false,
      action: () => this.server.signOut(),
    });
  }
}

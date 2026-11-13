import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

/** Who is looking at the catalog, as the kit's server says. */
export interface KitSession {
  /** The server has an admin (a user and a password in its environment). */
  configured: boolean;
  signedIn: boolean;
  user: string | null;
  /** The server changes the kit's files too (the development server), not only the variables. */
  files: boolean;
}

/** One save into the kit, as the server keeps it (the History page). */
export interface KitSave {
  id: string;
  /** When, ISO. */
  at: string;
  user: string | null;
  /** The save it undid. */
  restores?: string;
  kind: 'variables' | 'file';
  changes?: { name: string; from: string; to: string }[];
  path?: string;
  bytesBefore?: number;
  bytesAfter?: number;
}

const NOBODY: KitSession = { configured: false, signedIn: false, user: null, files: false };

/**
 * The kit's server, as the catalog sees it. Everyone reads; only the admin changes (lenzi, 2026-11-12:
 * "pagina admin per abilitare la modifica (unico utente). L'endpoint pubblico mostra solo le info."):
 * signed in on the Admin page, the variables are saved everywhere, the kit's files where the server
 * changes them (`npm start`; in Docker a new build would be needed to show them).
 */
@Injectable({
  providedIn: 'root',
})
export class KitServer {
  private readonly http = inject(HttpClient);

  /** null until known; without a server, nobody. */
  readonly session = signal<KitSession | null>(null);

  /** The variables can be saved from this browser; null until known. */
  readonly canSaveVariables = computed(() => this.session()?.signedIn ?? null);
  /** The kit's files can be saved from this browser; null until known. */
  readonly canSave = computed(() => {
    const session = this.session();
    return session ? session.signedIn && session.files : null;
  });

  constructor() {
    this.http
      .get<KitSession>('api/session')
      .pipe(catchError(() => of(NOBODY)))
      .subscribe((session) => this.session.set(session));
  }

  /** A wrong user or password fails with the server's words (an ApiError). */
  signIn(user: string, password: string): Observable<KitSession> {
    return this.http.post<KitSession>('api/session', { user, password }).pipe(tap((session) => this.session.set(session)));
  }

  signOut(): Observable<KitSession> {
    return this.http.delete<KitSession>('api/session').pipe(tap((session) => this.session.set(session)));
  }

  /** Writes a file of the kit (`path` relative to projects/kit): the catalog rebuilds with it. */
  saveFile(path: string, content: string): Observable<{ path: string }> {
    return this.http.put<{ path: string }>('api/files', { path, content });
  }

  /** Every save into the kit, the newest first. */
  history(): Observable<KitSave[]> {
    return this.http.get<{ entries: KitSave[] }>('api/history').pipe(map((body) => body.entries));
  }

  /** Undoes a save: what it changed goes back to what it was before it. */
  restore(id: string): Observable<{ entry: KitSave | null }> {
    return this.http.post<{ entry: KitSave | null }>(`api/history/${encodeURIComponent(id)}/restore`, {});
  }
}

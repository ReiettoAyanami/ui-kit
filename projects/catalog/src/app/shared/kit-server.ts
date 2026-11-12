import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

/**
 * The kit's server, as the catalog sees it: whether it can write into the kit (the development
 * server, `npm start`: yes; Docker or a static copy: no), and writing a file of the kit.
 */
@Injectable({
  providedIn: 'root',
})
export class KitServer {
  private readonly http = inject(HttpClient);

  /** null until known. */
  readonly canSave = signal<boolean | null>(null);

  constructor() {
    this.http
      .get<{ ok: boolean; canSave?: boolean }>('api/health')
      .pipe(catchError(() => of({ ok: false, canSave: false })))
      .subscribe((health) => this.canSave.set(health.canSave === true));
  }

  /** Writes a file of the kit (`path` relative to projects/kit): the catalog rebuilds with it. */
  saveFile(path: string, content: string): Observable<{ path: string }> {
    return this.http.put<{ path: string }>('api/files', { path, content });
  }
}

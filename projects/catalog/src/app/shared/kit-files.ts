import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

/**
 * The kit's own files, as the catalog serves them (angular.json copies projects/kit to `kit-src/`):
 * the code shown on every page, the rules (README.md), the AI notes (AI.md), RULES.md, AI-RULES.md,
 * libraries.json. Each one is asked once.
 */
@Injectable({
  providedIn: 'root',
})
export class KitFiles {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<string>>();

  /** A file's text; `path` relative to projects/kit ("src/lib/add-button/add-button.ts"). */
  text(path: string): Observable<string> {
    let file = this.cache.get(path);
    if (!file) {
      file = this.http.get(`kit-src/${path}`, { responseType: 'text' }).pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.cache.set(path, file);
    }
    return file;
  }

  json<T>(path: string): Observable<T> {
    return this.http.get<T>(`kit-src/${path}`);
  }
}

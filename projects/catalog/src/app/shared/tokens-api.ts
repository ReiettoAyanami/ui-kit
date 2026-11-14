import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';

/** One global variable, as projects/kit/src/styles/tokens.json describes it. */
export interface TokenDef {
  name: string;
  label: string;
  type: 'percent' | 'length' | 'time' | 'number' | 'color' | 'easing' | 'choice';
  value: string;
  /** A choice's words, each with what it is called. */
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  description: string;
  why: string;
}

export interface TokenGroup {
  id: string;
  label: string;
  description: string;
  tokens: TokenDef[];
}

export interface TokensDocument {
  about: string;
  groups: TokenGroup[];
  /** The server can save: only the development server (npm start). */
  canSave: boolean;
}

/**
 * The kit's global variables: from the kit's server (which can save them in development), or, where
 * there is none, the file the catalog ships (read only).
 */
@Injectable({
  providedIn: 'root',
})
export class TokensApi {
  private readonly http = inject(HttpClient);

  load(): Observable<TokensDocument> {
    return this.http.get<TokensDocument>('api/tokens').pipe(
      catchError(() =>
        this.http.get<Omit<TokensDocument, 'canSave'>>('kit-src/src/styles/tokens.json').pipe(map((document) => ({ ...document, canSave: false }))),
      ),
    );
  }

  /** Saves the values into tokens.json and tokens.css: the server refuses a wrong one (an ApiError). */
  save(values: Record<string, string>): Observable<TokensDocument> {
    return this.http.put<TokensDocument>('api/tokens', { values });
  }
}

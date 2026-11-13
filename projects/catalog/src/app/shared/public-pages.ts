import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanMatchFn, Router } from '@angular/router';
import { Observable, catchError, combineLatest, filter, map, of, take, tap, throwError } from 'rxjs';

import { KitServer } from './kit-server';
import { SitePageData, hiddenResources, sitePages } from './site-pages';

/**
 * Which pages of the catalog the public sees (lenzi, 2026-11-13: "In the admin page i should be able
 * to decide what pages get exposed to the public and which not"). The list is the catalog's own routes
 * (site-pages.ts); the choice is the server's, the same for every visitor. A hidden page is not in
 * the menu or in a list, its address says "not found", and the server refuses what it reads. The
 * admin sees everything.
 */
@Injectable({
  providedIn: 'root',
})
export class PublicPages {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly server = inject(KitServer);

  /** Every page there is, from the routes and the registry. */
  readonly all = computed(() => sitePages(this.router.config));
  /** The hidden ones; null until known (without a server: none). */
  readonly hidden = signal<ReadonlySet<string> | null>(null);

  private readonly known = combineLatest([toObservable(this.hidden), toObservable(this.server.session)]).pipe(
    filter(([hidden, session]) => hidden !== null && session !== null),
    take(1),
    map(() => undefined),
  );

  constructor() {
    this.http
      .get<{ hidden: string[] }>('api/pages')
      .pipe(catchError(() => of({ hidden: [] as string[] })))
      .subscribe((answer) => this.hidden.set(new Set(answer.hidden)));
  }

  /** Whether whoever is looking may see this page ("rules", "components/add-button"). */
  shows(key: string): boolean {
    return this.server.admin() || !(this.hidden()?.has(key) ?? false);
  }

  /** Once it is known who is looking and what is hidden. */
  whenKnown(): Observable<void> {
    return this.known;
  }

  /** Shows these pages to the public, or hides them. Applied at once; taken back if the server refuses. */
  setPublic(keys: readonly string[], shown: boolean): Observable<unknown> {
    const before = this.hidden() ?? new Set<string>();
    const next = new Set(before);
    for (const key of keys) {
      if (shown) next.delete(key);
      else next.add(key);
    }
    this.hidden.set(next);
    return this.http.put<{ hidden: string[] }>('api/pages', { hidden: [...next], resources: hiddenResources(this.all(), next) }).pipe(
      tap((answer) => this.hidden.set(new Set(answer.hidden))),
      catchError((error: unknown) => {
        this.hidden.set(before);
        return throwError(() => error);
      }),
    );
  }
}

/** A route the public may not see does not match: its address ends at the not-found page. */
export const publicPage: CanMatchFn = (route, segments) => {
  const pages = inject(PublicPages);
  const paths = segments.map((segment) => segment.path);
  const key = (route.data as SitePageData | undefined)?.pageKey?.(paths) ?? paths.join('/');
  return pages.whenKnown().pipe(map(() => pages.shows(key)));
};

import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, from, map, of, switchMap, tap, throwError } from 'rxjs';

import type { LenziScene } from '@lenzi/ui-kit/backgrounds';

import { CODE_SCENES } from '../scenes';
import { sitePages } from '../site-map';
import type { SavedScene } from './saved-scenes';

/**
 * How a scene of the server's is checked (`cleanScene`), loaded when the choices come: it brings the scenes' engine
 * with it, which is not in the catalog's first download (the background itself is deferred too).
 */
type Clean = (raw: unknown) => LenziScene | null;
const cleaning = (): Observable<Clean> => from(import('./scene-code').then((module) => module.cleanScene));

/** A background as the admin chooses it: none, a scene of the catalog's code, or one of the gallery. */
export type BackgroundChoice = null | { code: string } | { saved: string };

/** A page's background: on a computer, and on a phone (or as on a computer). */
export interface PageBackground {
  computer: BackgroundChoice;
  phone: BackgroundChoice | 'same';
}

/** A choice as the server gives it: a scene of the gallery comes whole, or says it was taken out. */
type ShownChoice = null | { code: string } | { saved: string; name: string; scene: LenziScene } | { saved: string; missing: true };
interface ShownBackground {
  computer: ShownChoice;
  phone: ShownChoice | 'same';
}

/** Every page of a component: one background for all of them. */
export const EVERY_COMPONENT = 'components/*';

/** The pages that are a scene themselves (the maker, a scene alone): no background of their own. */
const SCENE_PAGES: ReadonlySet<string> = new Set(['scenes/maker', 'scene']);

const HOME: PageBackground = { computer: { code: 'home' }, phone: { code: 'home-phone' } };
const OVERVIEW: PageBackground = { computer: { code: 'overview' }, phone: { code: 'overview-phone' } };
const NONE: PageBackground = { computer: null, phone: 'same' };

/**
 * The catalog's own background, where the admin did not choose one: behind the overview its blobs that stay put, of
 * three materials, the glass liquid (lenzi, 2026-11-26: the home's scene moves inside one of its tiles instead: "al
 * posto di metterle come sfondo vorrei applicarlo ad una delle schede della overview"); the home's scene behind the
 * components (lenzi, 2026-11-14: "put the same scene that there's on the overview in the background of the
 * components"), the lighter ones on a phone; nothing behind the rest.
 */
export const OWN_BACKGROUNDS: Readonly<Record<string, PageBackground>> = { '': OVERVIEW, components: HOME };

/** The page whose background an address has: a component's is every component's; a frame or a scene's, none. */
export function backgroundKey(url: string): string | null {
  const key = decodeURIComponent(url.replace(/[?#].*$/, '')).replace(/^\/+|\/+$/g, '');
  if (key === 'frame' || key.startsWith('frame/') || SCENE_PAGES.has(key)) return null;
  return key.startsWith('components/') ? EVERY_COMPONENT : key;
}

/** A choice as a select's value: "none", "code:home", "saved:<id>", and on a phone "same". */
export function choiceValue(choice: BackgroundChoice | 'same'): string {
  if (choice === 'same') return 'same';
  if (choice === null) return 'none';
  return 'code' in choice ? `code:${choice.code}` : `saved:${choice.saved}`;
}

/** A select's value as a choice (the other way round). */
export function choiceOf(value: string): BackgroundChoice | 'same' {
  if (value === 'same') return 'same';
  if (value.startsWith('code:')) return { code: value.slice(5) };
  if (value.startsWith('saved:')) return { saved: value.slice(6) };
  return null;
}

/** What a choice of the server's is, as the catalog keeps it: the gallery's scenes checked like any other. */
function shownChoice(raw: unknown, clean: Clean): ShownChoice | 'same' | undefined {
  if (raw === null || raw === 'same') return raw;
  if (!raw || typeof raw !== 'object') return undefined;
  const body = raw as Record<string, unknown>;
  if (typeof body['code'] === 'string') return { code: body['code'] };
  if (typeof body['saved'] !== 'string') return undefined;
  const scene = body['missing'] === true ? null : clean(body['scene']);
  return scene ? { saved: body['saved'], name: typeof body['name'] === 'string' ? body['name'] : '', scene } : { saved: body['saved'], missing: true };
}

function read(pages: unknown, clean: Clean): Record<string, ShownBackground> {
  const out: Record<string, ShownBackground> = {};
  for (const [key, raw] of Object.entries(pages && typeof pages === 'object' ? pages : {})) {
    const computer = shownChoice((raw as Partial<ShownBackground> | null)?.computer, clean);
    const phone = shownChoice((raw as Partial<ShownBackground> | null)?.phone, clean);
    if (computer !== undefined && computer !== 'same' && phone !== undefined) out[key] = { computer, phone };
  }
  return out;
}

/** A choice without its scene: what the admin chose. */
const bare = (choice: ShownChoice): BackgroundChoice => (choice === null ? null : 'code' in choice ? { code: choice.code } : { saved: choice.saved });

/**
 * The scene of a choice: none (null), or not there (undefined: a scene of the gallery taken out, a name of the code
 * that is not there any more), and the page has its own again.
 */
function sceneOf(choice: ShownChoice | PageBackground['computer']): LenziScene | null | undefined {
  if (choice === null) return null;
  if ('code' in choice) return CODE_SCENES[choice.code];
  return 'scene' in choice ? choice.scene : undefined;
}

/**
 * The pages' backgrounds (lenzi, 2026-11-17: "Make it possible so i can configure the various backgrounds of the
 * pages"): one scene behind each page (RULES.md, "One background per page"), on a computer and on a phone, the
 * admin's choice on the kit's server and the same for every visitor; where the admin did not choose, the catalog's
 * own (OWN_BACKGROUNDS). A scene of the gallery comes with the choices, whole: a visitor never reads the gallery.
 */
@Injectable({
  providedIn: 'root',
})
export class PageBackgrounds {
  private readonly http = inject(HttpClient);

  /** The admin's choices by page, with the gallery's scenes; null until known (then no background is drawn yet). */
  private readonly shown = signal<Readonly<Record<string, ShownBackground>> | null>(null);

  /**
   * The pages that may have a background: the site map's, but the ones that are a scene themselves, and every
   * component's page as one.
   */
  readonly pages: readonly { key: string; title: string }[] = [
    ...sitePages([])
      .filter((page) => !SCENE_PAGES.has(page.key))
      .map((page) => ({ key: page.key, title: page.key === '' ? 'Overview' : page.title })),
    { key: EVERY_COMPONENT, title: "A component's page" },
  ];

  constructor() {
    this.http
      .get<{ pages: unknown }>('api/backgrounds')
      .pipe(
        catchError(() => of({ pages: {} })),
        switchMap((answer) => cleaning().pipe(map((clean) => read(answer.pages, clean)))),
        // the check could not be loaded (offline): the catalog's own everywhere
        catchError(() => of({})),
      )
      .subscribe((pages) => this.shown.set(pages));
  }

  /** Whether the choices are known. */
  readonly known = () => this.shown() !== null;

  /** A page's background: the admin's choice, or the catalog's own. */
  of(key: string): PageBackground {
    const chosen = this.shown()?.[key];
    if (!chosen) return OWN_BACKGROUNDS[key] ?? NONE;
    return { computer: bare(chosen.computer), phone: chosen.phone === 'same' ? 'same' : bare(chosen.phone) };
  }

  /** Whether the admin chose this page's background (or it has the catalog's own). */
  chosen(key: string): boolean {
    return !!this.shown()?.[key];
  }

  /** The gallery's scenes a page's background names that were taken out: said on the Admin page. */
  missing(key: string): { computer: boolean; phone: boolean } {
    const chosen = this.shown()?.[key];
    const gone = (choice: ShownChoice | 'same' | undefined) => !!choice && choice !== 'same' && 'missing' in choice;
    return { computer: gone(chosen?.computer), phone: gone(chosen?.phone) };
  }

  /** The scene behind a page, on a phone or not; null: none (or not known yet). */
  sceneFor(key: string | null, phone: boolean): LenziScene | null {
    const shown = this.shown();
    if (key === null || shown === null) return null;
    const pick = <T>(background: { computer: T; phone: T | 'same' }): T => (phone && background.phone !== 'same' ? background.phone : background.computer);
    const own = pick(OWN_BACKGROUNDS[key] ?? NONE);
    const chosen = shown[key];
    const scene = chosen ? sceneOf(pick(chosen)) : sceneOf(own);
    // a scene that is not there any more: the page's own
    return scene === undefined ? (sceneOf(own) ?? null) : scene;
  }

  /**
   * Chooses a page's background: drawn at once (with the scene of the gallery it names, from `gallery`), saved for
   * every visitor; taken back if the server refuses.
   */
  set(key: string, background: PageBackground, gallery: readonly SavedScene[] = []): Observable<void> {
    const before = this.shown();
    const withScene = (choice: BackgroundChoice): ShownChoice => {
      if (choice === null || 'code' in choice) return choice;
      const kept = gallery.find((scene) => scene.id === choice.saved);
      return kept ? { saved: kept.id, name: kept.name, scene: kept.scene } : { saved: choice.saved, missing: true };
    };
    this.shown.set({ ...before, [key]: { computer: withScene(background.computer), phone: background.phone === 'same' ? 'same' : withScene(background.phone) } });
    return this.http.put<{ pages: unknown }>('api/backgrounds', { page: key, ...background }).pipe(
      switchMap((answer) => cleaning().pipe(tap((clean) => this.shown.set(read(answer.pages, clean))))),
      map(() => undefined),
      catchError((error: unknown) => {
        this.shown.set(before);
        return throwError(() => error);
      }),
    );
  }
}

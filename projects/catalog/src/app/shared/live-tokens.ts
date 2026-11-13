import { DOCUMENT, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';

import { readPreference, writePreference } from '@lenzi/ui-kit';

import { ADMIN_HINT, KitServer } from './kit-server';

const KEY = 'kit-catalog.live-variables';
const LOG_KEY = 'kit-catalog.variables-log';
/** Written when the kit's own values changed (a save, a save undone): every page reads them again. */
const KIT_CHANGED_KEY = 'kit-catalog.kit-changed';
/** Changes of one variable closer than this are one change (a slider dragged, a colour tried). */
const SAME_GESTURE = 30_000;
const MAX_LOG = 200;

/** One change of a variable made in this browser. A null value is the kit's own. */
export interface VariableChange {
  name: string;
  from: string | null;
  to: string | null;
  /** What the kit's own value was then (it may have been saved over since); null when not known. */
  kit: string | null;
  /** When, in milliseconds. */
  at: number;
}

/** A list or a record kept as JSON in a storage; the fallback when there is none, or it is not one. */
function storedJson<T>(storage: Storage | null, key: string, valid: (parsed: unknown) => parsed is T, fallback: T): T {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(key) ?? 'null');
    return valid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

const isRecord = (parsed: unknown): parsed is Record<string, string> => typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
const isLog = (parsed: unknown): parsed is VariableChange[] => Array.isArray(parsed);

/**
 * The global variables changed on the Variables page and not saved yet: they apply at once, on this
 * page and in every demo's frame (the browser keeps them, and each frame follows), until they are
 * saved into the kit or discarded. Every change is also written down (`log`, the History page: lenzi,
 * 2026-11-12, "Aggiungi anche pagina di history delle modifiche"), so there is always a way back.
 *
 * The admin's changes are kept by the browser until saved or discarded. A visitor's are "a temporary
 * edit going away with the first refresh" (lenzi, 2026-11-13): kept for this tab only (its frames
 * follow), and dropped when a page of the catalog is loaded again.
 */
@Injectable({
  providedIn: 'root',
})
export class LiveTokens {
  private readonly document = inject(DOCUMENT);
  private readonly server = inject(KitServer);

  /**
   * Kept between visits (the admin) or for this tab until a reload (a visitor). Before the server
   * says who is looking: as on the last visit.
   */
  private readonly kept = computed(() => this.server.session()?.signedIn ?? readPreference(ADMIN_HINT, (value) => value === '1', false));

  readonly overrides = signal<Record<string, string>>({});
  /** What was changed in this browser, the oldest first. */
  readonly log = signal<VariableChange[]>([]);
  private applied = new Set<string>();

  constructor() {
    // A page loaded again: a visitor's changes are gone. A demo's frame is not a page of its own: it
    // follows the page it is in.
    if (!this.document.location.pathname.startsWith('/frame/')) {
      this.write(false, KEY, null);
      this.write(false, LOG_KEY, null);
    }
    this.overrides.set(storedJson(this.storage(this.kept()), KEY, isRecord, {}));
    this.log.set(storedJson(this.storage(this.kept()), LOG_KEY, isLog, []));
    // Who is looking decides where the changes are: read them from there (again when the admin signs in or out).
    effect(() => {
      const kept = this.kept();
      untracked(() => {
        this.overrides.set(storedJson(this.storage(kept), KEY, isRecord, {}));
        this.log.set(storedJson(this.storage(kept), LOG_KEY, isLog, []));
      });
    });
    effect(() => {
      const overrides = this.overrides();
      const style = this.document.documentElement.style;
      for (const name of this.applied) if (!(name in overrides)) style.removeProperty(name);
      for (const [name, value] of Object.entries(overrides)) style.setProperty(name, value);
      this.applied = new Set(Object.keys(overrides));
    });
    // Another page of the catalog (the Variables page, a demo's frame) changed them.
    this.document.defaultView?.addEventListener('storage', (event) => {
      const mine = this.storage(this.kept());
      if (event.storageArea !== mine && event.key !== KIT_CHANGED_KEY) return;
      if (event.key === KEY) this.overrides.set(storedJson(mine, KEY, isRecord, {}));
      if (event.key === LOG_KEY) this.log.set(storedJson(mine, LOG_KEY, isLog, []));
      if (event.key === KIT_CHANGED_KEY) void this.readKitCss();
    });
  }

  set(name: string, value: string): void {
    this.update({ ...this.overrides(), [name]: value });
  }

  reset(name: string): void {
    const { [name]: _gone, ...rest } = this.overrides();
    this.update(rest);
  }

  clear(): void {
    this.update({});
  }

  /** All the changes at once (an editor of the variables as CSS). */
  replace(overrides: Record<string, string>): void {
    // the object itself: whoever passed it knows the change is its own
    this.update(overrides);
  }

  /**
   * Saved into the kit: they are the kit's values now, not changes of this browser (nothing to write
   * down). The kit's values are read again first, so nothing flickers back to the old ones.
   */
  async saved(names: readonly string[]): Promise<void> {
    await this.kitChanged();
    const rest = { ...this.overrides() };
    for (const name of names) delete rest[name];
    this.update(rest, false);
  }

  /** The kit's own values changed on the server: this page and every other one of the catalog read them again. */
  async kitChanged(): Promise<void> {
    writePreference(KIT_CHANGED_KEY, String(Date.now()));
    await this.readKitCss();
  }

  /** The server's variables (index.html's `api/tokens.css`) again: the new sheet takes the old one's place once it is there. */
  private readKitCss(): Promise<void> {
    const old = this.document.querySelector<HTMLLinkElement>('link[data-kit-variables]');
    if (!old) return Promise.resolve();
    return new Promise((resolve) => {
      const next = old.cloneNode() as HTMLLinkElement;
      next.href = `api/tokens.css?at=${Date.now()}`;
      next.addEventListener('load', () => (old.remove(), resolve()), { once: true });
      next.addEventListener('error', () => (next.remove(), resolve()), { once: true });
      old.after(next);
    });
  }

  /** Forgets what was written down (the variables stay as they are). */
  clearLog(): void {
    this.log.set([]);
    this.write(this.kept(), LOG_KEY, '[]');
  }

  private update(overrides: Record<string, string>, record = true): void {
    if (record) this.record(this.overrides(), overrides);
    this.overrides.set(overrides);
    this.write(this.kept(), KEY, JSON.stringify(overrides));
  }

  /** The kit's value of a variable, as the page has it under this browser's change. */
  private kitValue(name: string): string | null {
    const root = this.document.documentElement;
    const mine = root.style.getPropertyValue(name);
    root.style.removeProperty(name);
    const kit = this.document.defaultView?.getComputedStyle(root).getPropertyValue(name).trim() || null;
    if (mine) root.style.setProperty(name, mine);
    return kit;
  }

  /** Writes down what differs between the two, joined to the same variable's change of a moment ago. */
  private record(before: Record<string, string>, after: Record<string, string>): void {
    const now = Date.now();
    let log = this.log();
    for (const name of new Set([...Object.keys(before), ...Object.keys(after)])) {
      const from = before[name] ?? null;
      const to = after[name] ?? null;
      if (from === to) continue;
      const last = log[log.length - 1];
      if (last && last.name === name && now - last.at < SAME_GESTURE) {
        // the same gesture going on; back where it started, it was no change
        log = last.from === to ? log.slice(0, -1) : [...log.slice(0, -1), { ...last, to, at: now }];
      } else {
        log = [...log, { name, from, to, kit: this.kitValue(name), at: now }];
      }
    }
    if (log === this.log()) return;
    log = log.slice(-MAX_LOG);
    this.log.set(log);
    this.write(this.kept(), LOG_KEY, JSON.stringify(log));
  }

  /** Where the changes are: the browser's lasting storage, or this tab's. None where the browser keeps nothing. */
  private storage(kept: boolean): Storage | null {
    try {
      const view = this.document.defaultView;
      return (kept ? view?.localStorage : view?.sessionStorage) ?? null;
    } catch {
      return null;
    }
  }

  private write(kept: boolean, key: string, value: string | null): void {
    try {
      if (value === null) this.storage(kept)?.removeItem(key);
      else this.storage(kept)?.setItem(key, value);
    } catch {
      // not kept: the change still applies on this page
    }
  }
}

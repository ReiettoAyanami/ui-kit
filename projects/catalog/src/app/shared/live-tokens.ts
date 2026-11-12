import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';

import { readPreference, writePreference } from '@lenzi/ui-kit';

const KEY = 'kit-catalog.live-variables';

/** The changes not saved yet, as this browser keeps them. */
function stored(): Record<string, string> {
  return readPreference<Record<string, string>>(
    KEY,
    (value) => {
      try {
        const parsed: unknown = JSON.parse(value);
        return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string>) : null;
      } catch {
        return null;
      }
    },
    {},
  );
}

/**
 * The global variables changed on the Variables page and not saved yet: they apply at once, on this
 * page and in every demo's frame (the browser keeps them, and each frame follows), until they are
 * saved into the kit or discarded.
 */
@Injectable({
  providedIn: 'root',
})
export class LiveTokens {
  private readonly document = inject(DOCUMENT);
  readonly overrides = signal<Record<string, string>>(stored());
  private applied = new Set<string>();

  constructor() {
    effect(() => {
      const overrides = this.overrides();
      const style = this.document.documentElement.style;
      for (const name of this.applied) if (!(name in overrides)) style.removeProperty(name);
      for (const [name, value] of Object.entries(overrides)) style.setProperty(name, value);
      this.applied = new Set(Object.keys(overrides));
    });
    // Another page of the catalog (the Variables page, a demo's frame) changed them.
    this.document.defaultView?.addEventListener('storage', (event) => {
      if (event.key === KEY) this.overrides.set(stored());
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

  private update(overrides: Record<string, string>): void {
    this.overrides.set(overrides);
    writePreference(KEY, JSON.stringify(overrides));
  }
}

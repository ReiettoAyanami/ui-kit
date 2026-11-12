// What this browser remembers for a person: display choices (a period, a toggle, Reduce
// transparency), in localStorage, never in a database. A plain module (no schematic makes one).
// From substance-tracker `ui/preferences.ts`.

/** A remembered choice, if it is still a valid one; otherwise, or when the browser keeps nothing, the fallback. */
export function readPreference<T>(key: string, valid: (value: string) => T | null, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return (stored === null ? null : valid(stored)) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Remembers a choice. When the browser keeps nothing (private mode, a full storage), the choice still applies until the page is closed. */
export function writePreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not remembered: the choice still applies on this page.
  }
}

// What was saved into the kit, and when (lenzi, 2026-11-12: "Aggiungi anche pagina di history delle
// modifiche"): one JSON line per save, the newest last. A save of variables keeps each value before
// and after; a save of a file keeps the text it replaced, so the save can be undone. The file is
// kept short: the oldest saves go first. A plain Node module, no dependencies.

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const MAX_ENTRIES = 200;
/** The texts of replaced files, all together: older ones are dropped with their saves. */
const MAX_BYTES = 8 * 1024 * 1024;

/** @param {string | null} path where the lines are kept; null: nothing is kept. */
export function createHistory(path, { now = () => new Date() } = {}) {
  /** One write at a time: two saves never interleave their lines. */
  let queue = Promise.resolve();

  async function read() {
    if (!path) return [];
    const text = await readFile(path, 'utf8').catch(() => '');
    const entries = [];
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        entries.push(JSON.parse(line));
      } catch {
        // a line cut by a crash: the others still count
      }
    }
    return entries;
  }

  return {
    /** Every save, the oldest first, with the replaced texts. */
    read,

    /** A save by its id, or null. */
    async find(id) {
      return (await read()).find((entry) => entry.id === id) ?? null;
    },

    /**
     * Adds a save and gives it back with its id and time.
     * @param {{ kind: 'variables', changes: { name: string, from: string, to: string }[] } | { kind: 'file', path: string, before: string, bytesBefore: number, bytesAfter: number }} entry
     */
    add(entry, { user = null, restores = null } = {}) {
      const full = { id: randomUUID(), at: now().toISOString(), user, ...(restores ? { restores } : {}), ...entry };
      if (!path) return Promise.resolve(full);
      const written = queue.then(async () => {
        let entries = [...(await read()), full].slice(-MAX_ENTRIES);
        while (entries.length > 1 && entries.reduce((sum, e) => sum + (e.before?.length ?? 0), 0) > MAX_BYTES) entries = entries.slice(1);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
        return full;
      });
      queue = written.catch(() => undefined);
      return written;
    },
  };
}

/** A save as everyone may see it: without the text it replaced. */
export function publicEntry({ before: _before, ...entry }) {
  return entry;
}

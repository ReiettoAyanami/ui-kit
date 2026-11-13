// Which pages of the catalog the public sees (lenzi, 2026-11-13: "In the admin page i should be able to
// decide what pages get exposed to the public and which not"). The catalog knows its own pages (its
// routes and its registry); the admin sends the ones to hide, and what each of them reads from the
// server, so that a hidden page's documents are refused too, not only left out of the menu. Kept in
// one JSON file. A plain Node module, no dependencies.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const PAGE = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$|^$/;
const RESOURCE = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,299}$/;

/** What is wrong with what the admin sent, or null. */
export function invalidPages({ hidden, resources }) {
  if (hidden.length > 1000 || resources.length > 10000) return 'Too many pages.';
  const badPage = hidden.find((page) => !PAGE.test(page) || page.includes('..'));
  if (badPage !== undefined) return `Not a page: ${badPage}`;
  const badResource = resources.find((resource) => !RESOURCE.test(resource) || resource.includes('..'));
  if (badResource !== undefined) return `Not a file of the catalog: ${badResource}`;
  return null;
}

/** @param {string | null} path where the choice is kept; null: only while the server runs. */
export async function createPages(path) {
  let state = { hidden: [], resources: [] };
  if (path) {
    const stored = await readFile(path, 'utf8').then(JSON.parse).catch(() => null);
    if (stored && Array.isArray(stored.hidden) && Array.isArray(stored.resources) && !invalidPages(stored)) {
      state = { hidden: stored.hidden, resources: stored.resources };
    }
  }
  let refused = new Set(state.resources);

  return {
    /** The hidden pages, by their address without the first "/" ("rules", "components/add-button"). */
    hidden: () => state.hidden,

    /** Whether the public is refused this address of the server ("kit-src/RULES.md", "api/history"). */
    refuses: (resource) => refused.has(resource),

    async set({ hidden, resources }) {
      state = { hidden: [...new Set(hidden)].sort(), resources: [...new Set(resources)].sort() };
      refused = new Set(state.resources);
      if (path) {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, `${JSON.stringify(state, null, 2)}\n`);
      }
      return state.hidden;
    },
  };
}

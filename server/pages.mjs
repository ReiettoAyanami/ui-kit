// Which pages of the catalog the public sees (lenzi, 2026-11-13: "In the admin page i should be able to
// decide what pages get exposed to the public and which not"), and what the public may read from the
// server because of it ("Mi serve che le pagine nascoste siano veramente irraggiungibili dagli utenti
// esterni").
//
// The build writes the catalog's pages down (tools/pages.mjs → site-pages.json): each with what it
// reads from here. With that, the server is closed by default: of the kit's files (kit-src/) and of
// what the pages read, the public gets only what a public page reads. A file no page reads, a new
// file, the documents of a hidden page: they are the admin's alone. The catalog itself (the overview,
// the components) is always public; the admin hides the other pages. Kept in one JSON file.
// A plain Node module, no dependencies.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const PAGE = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;

/**
 * @param {object} options
 * @param {string | null} [options.path] where the choice is kept; null: only while the server runs
 * @param {string | null} [options.sitePagesPath] the catalog's pages, written by its build; null (the
 *   development server, which does not serve the catalog): nothing is refused here
 */
export async function createPages({ path = null, sitePagesPath = null } = {}) {
  /** @type {{ key: string, always: boolean, resources: string[] }[] | null} */
  const site = sitePagesPath ? JSON.parse(await readFile(sitePagesPath, 'utf8')).pages : null;
  if (sitePagesPath && !Array.isArray(site)) throw new Error(`${sitePagesPath} does not list the catalog's pages: run "npm run pages".`);
  const hideable = site && new Set(site.filter((page) => !page.always).map((page) => page.key));
  const known = site && new Set(site.flatMap((page) => page.resources));

  let hidden = [];
  if (path) {
    const stored = await readFile(path, 'utf8').then(JSON.parse).catch(() => null);
    // a page that is not there any more, or cannot be hidden any more, is dropped
    if (Array.isArray(stored?.hidden)) hidden = stored.hidden.filter((key) => typeof key === 'string' && !invalid([key]));
  }
  let open = openResources();

  /** What the public pages read. */
  function openResources() {
    return site && new Set(site.filter((page) => !hidden.includes(page.key)).flatMap((page) => page.resources));
  }

  /** What is wrong with the pages the admin wants hidden, or null. */
  function invalid(keys) {
    if (keys.length > 1000) return 'Too many pages.';
    const bad = keys.find((key) => (hideable ? !hideable.has(key) : !PAGE.test(key) || key.includes('..')));
    if (bad === undefined) return null;
    return site?.some((page) => page.key === bad) ? `/${bad} is always public.` : `Not a page of the catalog: ${bad}`;
  }

  return {
    /** The hidden pages, by their address without the first "/" ("rules", "history"). */
    hidden: () => hidden,
    isHidden: (key) => hidden.includes(key),
    invalid,

    /**
     * Whether the public is refused this address of the server ("kit-src/RULES.md", "api/history"):
     * a file of the kit, or something a page reads, that no public page reads.
     */
    refuses(resource) {
      if (!site || open.has(resource)) return false;
      return resource.startsWith('kit-src/') || known.has(resource);
    },

    async set(keys) {
      hidden = [...new Set(keys)].sort();
      open = openResources();
      if (path) {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, `${JSON.stringify({ hidden }, null, 2)}\n`);
      }
      return hidden;
    },
  };
}

// The pages' backgrounds (lenzi, 2026-11-17: "Make it possible so i can configure the various backgrounds of the
// pages"): for each page of the catalog, the scene behind it on a computer and on a phone, the admin's choice and
// the same for every visitor. A choice is no background (null), a scene of the catalog's code ({ code: 'home' }),
// or a scene the admin keeps in the gallery ({ saved: '<id>' }); on a phone also "as on a computer" ('same').
// Every page of a component is one key, `components/*`. A page the admin never chose for keeps the catalog's own
// (the home's scene on the overview and the components): the catalog knows it, not this file. Kept in one JSON
// file (Docker: on the volume). A plain Node module, no dependencies.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/** Every page of a component, one choice for all of them. */
export const EVERY_COMPONENT = 'components/*';

/** How many pages may have a background of the admin's. */
export const BACKGROUND_LIMITS = { pages: 200 };

const PAGE = /^(?:[A-Za-z0-9][A-Za-z0-9._/-]{0,199})?$/;
const CODE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const SAVED = /^[A-Za-z0-9_-]{1,40}$/;

const record = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : null);

/** A choice as it is kept (null, { code }, { saved }, and on a phone 'same'); undefined when it is none of them. */
export function choiceOf(value, { phone = false } = {}) {
  if (value === null) return null;
  if (phone && value === 'same') return 'same';
  const body = record(value);
  if (!body || Object.keys(body).length !== 1) return undefined;
  if (typeof body.code === 'string' && CODE.test(body.code)) return { code: body.code };
  if (typeof body.saved === 'string' && SAVED.test(body.saved)) return { saved: body.saved };
  return undefined;
}

/** Whether a key names a page: an address without the first "/" ("" is the overview), or every component's page. */
const isPageKey = (key) => typeof key === 'string' && (key === EVERY_COMPONENT || (PAGE.test(key) && !key.includes('..') && !key.endsWith('/')));

/**
 * @param {string | null} [path] where the choices are kept; null: only while the server runs
 */
export async function createBackgrounds(path = null) {
  /** @type {Record<string, { computer: object | null, phone: object | null | 'same' }>} */
  let pages = {};
  if (path) {
    const stored = await readFile(path, 'utf8').then(JSON.parse).catch(() => null);
    for (const [key, background] of Object.entries(record(stored?.pages) ?? {})) {
      const computer = choiceOf(record(background)?.computer);
      const phone = choiceOf(record(background)?.phone, { phone: true });
      // what is not a choice any more is dropped: the page has the catalog's own again
      if (isPageKey(key) && computer !== undefined && phone !== undefined) pages[key] = { computer, phone };
    }
  }

  return {
    /** Every page's background the admin chose, by page. */
    all: () => pages,

    /**
     * What is wrong with a page's background, or null.
     * @param {(key: string) => boolean} exists whether the catalog has this page (every key, without its list)
     */
    invalid(page, background, exists = () => true) {
      if (!isPageKey(page) || (page !== EVERY_COMPONENT && !exists(page))) return `Not a page of the catalog: /${page}`;
      if (choiceOf(background?.computer) === undefined) return 'On a computer: no background (null), a scene of the code ({ "code" }) or one of yours ({ "saved" }).';
      if (choiceOf(background?.phone, { phone: true }) === undefined) return 'On a phone: "same", no background (null), a scene of the code ({ "code" }) or one of yours ({ "saved" }).';
      if (!(page in pages) && Object.keys(pages).length >= BACKGROUND_LIMITS.pages) return `${BACKGROUND_LIMITS.pages} pages at most have a background of their own.`;
      return null;
    },

    /** Keeps a page's background (checked with `invalid` first) and gives every page's back. */
    async set(page, background) {
      pages = { ...pages, [page]: { computer: choiceOf(background.computer), phone: choiceOf(background.phone, { phone: true }) } };
      if (path) {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, `${JSON.stringify({ pages }, null, 2)}\n`);
      }
      return pages;
    },
  };
}

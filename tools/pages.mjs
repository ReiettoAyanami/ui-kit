// `npm run pages` (part of `npm run build`): the pages of the catalog, written down for the server
// that serves it (dist/site-pages.json, the image's SITE_PAGES_FILE). From it the server knows what
// each page reads, and gives the public only what the public pages read. Never written by hand: it
// comes from the site map and the registry (projects/catalog/src/app/site-map.ts).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ROOT, loadSitePages } from './load-ts.mjs';

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pages = await loadSitePages();
  const file = join(ROOT, 'dist', 'site-pages.json');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify({ pages }, null, 2)}\n`);
  console.log(`dist/site-pages.json written: ${pages.length} pages, ${pages.filter((page) => !page.always).length} the admin can hide`);
}

// The site map as the server will get it: every page, and files that exist. Run by `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, loadSitePages } from './load-ts.mjs';

test('the site map lists the fixed pages and one page per piece, with what each reads', async () => {
  const pages = await loadSitePages();
  const keys = pages.map((page) => page.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const key of ['', 'components', 'rules', 'ai-rules', 'variables', 'libraries', 'history', 'admin', 'components/add-button']) {
    assert.ok(keys.includes(key), key || 'the overview');
  }
  // the catalog itself is always public; the documents' pages are the admin's to hide
  assert.deepEqual(pages.filter((page) => !page.always).map((page) => page.key).sort(), ['ai-rules', 'history', 'libraries', 'rules', 'variables']);
});

test('every file a page reads exists in the kit', async () => {
  for (const page of await loadSitePages()) {
    for (const resource of page.resources) {
      if (resource.startsWith('kit-src/')) assert.ok(existsSync(join(ROOT, 'projects', 'kit', resource.slice('kit-src/'.length))), `${page.key}: ${resource}`);
      else assert.match(resource, /^api\/[a-z]+$/, `${page.key}: ${resource}`);
    }
  }
});

test('hiding a page hides what it holds: no always-public page reads what a hideable page reads', async () => {
  const pages = await loadSitePages();
  const hideable = new Map(pages.filter((page) => !page.always).flatMap((page) => page.resources.map((resource) => [resource, page.key])));
  for (const page of pages.filter((candidate) => candidate.always)) {
    for (const resource of page.resources) assert.ok(!hideable.has(resource), `${page.key} reads ${resource}, which is /${hideable.get(resource)}'s`);
  }
});

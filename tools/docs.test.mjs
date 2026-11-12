// Every page of the catalog points at files that exist, and every piece of the library has a page:
// "every component has a page for itself, its rules" (lenzi, 2026-11-12). Run by `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const kit = join(root, 'projects', 'kit');

/** The catalog's registry, transpiled as it is (its demos are lazy imports: they never run here). */
async function registry() {
  const source = readFileSync(join(root, 'projects', 'catalog', 'src', 'app', 'registry.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  const file = join(mkdtempSync(join(tmpdir(), 'kit-registry-')), 'registry.mjs');
  writeFileSync(file, outputText);
  return import(pathToFileURL(file).href);
}

test('every file a page shows exists in the kit', async () => {
  const { DOCS } = await registry();
  for (const doc of DOCS) {
    for (const path of [doc.readme, doc.ai, ...doc.files]) assert.ok(existsSync(join(kit, path)), `${doc.id}: ${path}`);
    assert.ok(existsSync(join(root, 'projects', 'catalog', 'src', 'app', 'demos', `${doc.id}-demo`)), `${doc.id}: its demo`);
  }
});

test('every folder of the library has a page in the catalog', async () => {
  const { DOCS } = await registry();
  const shown = new Set(DOCS.flatMap((doc) => [doc.readme, ...doc.files]).map((path) => path.split('/').slice(0, -1).join('/')));
  for (const folder of readdirSync(join(kit, 'src', 'lib'))) {
    if (folder === 'provide-kit.ts') continue;
    assert.ok(shown.has(`src/lib/${folder}`), `src/lib/${folder} has no page`);
  }
});

test('every README has rules, every AI note says what to do', async () => {
  const { DOCS } = await registry();
  for (const doc of DOCS) {
    const readme = readFileSync(join(kit, doc.readme), 'utf8');
    const ai = readFileSync(join(kit, doc.ai), 'utf8');
    assert.match(readme, /^# /, `${doc.readme}: a title`);
    assert.match(readme, /## (Rules|What it does|Uses|provideLenziKit|describeError)/, `${doc.readme}: its rules`);
    assert.match(ai, /^# AI notes: /, `${doc.ai}: a title`);
    assert.ok(ai.split('\n').filter((line) => line.startsWith('- ')).length >= 3, `${doc.ai}: at least three notes`);
  }
});

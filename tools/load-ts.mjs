// A TypeScript data module of the catalog, loaded in Node as it is: transpiled alone (types and type
// imports dropped) into a temporary folder and imported. For modules that are data (the registry, the
// site map): what they import lazily never runs here.
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CATALOG_APP = join(ROOT, 'projects', 'catalog', 'src', 'app');

/** @param {string} path the .ts file */
export async function loadTs(path) {
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const file = join(mkdtempSync(join(tmpdir(), 'kit-ts-')), basename(path).replace(/\.ts$/, '.mjs'));
  writeFileSync(file, outputText);
  return import(pathToFileURL(file).href);
}

/** The catalog's registry (its demos are lazy imports: they never run here). */
export const loadRegistry = () => loadTs(join(CATALOG_APP, 'registry.ts'));

/** Every page of the catalog, as its site map and its registry say (site-map.ts). */
export async function loadSitePages() {
  const [{ sitePages }, { DOCS }] = await Promise.all([loadTs(join(CATALOG_APP, 'site-map.ts')), loadRegistry()]);
  return sitePages(DOCS);
}

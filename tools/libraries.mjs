// `npm run libraries`: the versions in projects/kit/libraries.json, read again from each project.
// The kit's own from this workspace; substance-tracker's and vtiger-reader's from their folders
// next to this one (Projects/), when they are there: the installed version when node_modules has
// it, else the range in package.json. A project or a package that is not there keeps what it had.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'projects', 'kit', 'libraries.json');

/** Where each project's packages are: a folder with a package.json (and maybe node_modules). */
const PROJECTS = {
  kit: [root, join(root, 'server')],
  'substance-tracker': [join(root, '..', 'substance-tracker', 'web'), join(root, '..', 'substance-tracker', 'api')],
  'vtiger-reader': [join(root, '..', 'vtiger-reader', 'web'), join(root, '..', 'vtiger-reader', 'api')],
};

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

/** The version of a package in a project: installed, else declared, else null. */
function versionIn(folders, name) {
  for (const folder of folders) {
    const installed = join(folder, 'node_modules', ...name.split('/'), 'package.json');
    if (existsSync(installed)) return readJson(installed).version;
  }
  for (const folder of folders) {
    const manifest = join(folder, 'package.json');
    if (!existsSync(manifest)) continue;
    const { dependencies = {}, devDependencies = {} } = readJson(manifest);
    const range = dependencies[name] ?? devDependencies[name];
    if (range) return range;
  }
  return null;
}

const document = readJson(file);
let found = 0;
for (const group of document.groups) {
  for (const library of group.libraries) {
    for (const [project, folders] of Object.entries(PROJECTS)) {
      if (!folders.some((folder) => existsSync(join(folder, 'package.json')))) continue;
      const version = versionIn(folders, library.package);
      if (version) {
        library.versions[project] = version;
        found++;
      } else {
        delete library.versions[project];
      }
    }
  }
}
writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);
console.log(`libraries.json: ${found} versions`);

// `ng add @lenzi/ui-kit` on a workspace made from scratch by Angular's own schematics, as `ng new`
// makes it: the schematic is compiled for the test (tsconfig.schematics.json) into a folder of its own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { SchematicTestRunner } = require('@angular-devkit/schematics/testing');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const kit = join(root, 'projects', 'kit');

function compiled() {
  // Inside the workspace, so the compiled schematic finds @schematics/angular in its node_modules.
  const out = join(root, 'node_modules', '.cache', 'lenzi-ng-add-test');
  rmSync(out, { recursive: true, force: true });
  execFileSync(process.execPath, [join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', join(kit, 'tsconfig.schematics.json'), '--outDir', out]);
  copyFileSync(join(kit, 'schematics', 'collection.json'), join(out, 'collection.json'));
  mkdirSync(join(out, 'ng-add'), { recursive: true });
  copyFileSync(join(kit, 'schematics', 'ng-add', 'schema.json'), join(out, 'ng-add', 'schema.json'));
  return join(out, 'collection.json');
}

async function app() {
  const runner = new SchematicTestRunner('@lenzi/ui-kit', compiled());
  const workspace = await runner.runExternalSchematic('@schematics/angular', 'workspace', { name: 'ws', newProjectRoot: 'projects', version: '21.2.0' });
  const tree = await runner.runExternalSchematic('@schematics/angular', 'application', { name: 'shifts', style: 'css', routing: true, skipTests: true }, workspace);
  return { runner, tree };
}

const json = (tree, path) => JSON.parse(tree.readText(path));

test('ng add sets up the styles, the providers and the peer dependencies', async () => {
  const { runner, tree } = await app();
  const result = await runner.runSchematic('ng-add', { project: 'shifts' }, tree);

  const styles = json(result, 'angular.json').projects.shifts.architect.build.options.styles;
  assert.deepEqual(styles.slice(0, 2), ['node_modules/@lenzi/ui-kit/styles/kit.scss', 'node_modules/@lenzi/ui-kit/styles/fonts.css']);
  assert.ok(styles.length > 2, "the app's own styles stay, after the kit's");

  const config = result.readText('projects/shifts/src/app/app.config.ts');
  assert.match(config, /import \{ provideLenziKit \} from '@lenzi\/ui-kit';/);
  assert.match(config, /provideLenziKit\(\{ appId: 'shifts' \}\)/);
  assert.match(config, /import \{ lenziErrorInterceptor \} from '@lenzi\/ui-kit\/http';/);
  assert.match(config, /provideHttpClient\(withFetch\(\), withInterceptors\(\[lenziErrorInterceptor\]\)\)/);

  const dependencies = json(result, 'package.json').dependencies;
  for (const peer of ['@angular/material', '@angular/cdk', '@fontsource/roboto-mono', 'material-icons']) assert.ok(dependencies[peer], peer);
});

test('run twice, ng add changes nothing the second time', async () => {
  const { runner, tree } = await app();
  const once = await runner.runSchematic('ng-add', { project: 'shifts' }, tree);
  const twice = await runner.runSchematic('ng-add', { project: 'shifts' }, once);
  assert.equal(twice.readText('projects/shifts/src/app/app.config.ts'), once.readText('projects/shifts/src/app/app.config.ts'));
  assert.deepEqual(json(twice, 'angular.json').projects.shifts.architect.build.options.styles, json(once, 'angular.json').projects.shifts.architect.build.options.styles);
});

test('an app id of its own, and a clear refusal without an application', async () => {
  const { runner, tree } = await app();
  const result = await runner.runSchematic('ng-add', { project: 'shifts', appId: 'turni' }, tree);
  assert.match(result.readText('projects/shifts/src/app/app.config.ts'), /provideLenziKit\(\{ appId: 'turni' \}\)/);
  await assert.rejects(runner.runSchematic('ng-add', { project: 'nothing' }, tree), /no application "nothing"/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildServer } from './server.mjs';
import { TOKENS_JSON } from './tokens.mjs';

/** A copy of the real tokens in a folder of its own: the tests never touch the kit's files. */
async function scratch() {
  const dir = await mkdtemp(join(tmpdir(), 'kit-server-'));
  const tokensJson = join(dir, 'tokens.json');
  const tokensCss = join(dir, 'tokens.css');
  await copyFile(TOKENS_JSON, tokensJson);
  return { dir, tokensJson, tokensCss };
}

test('gives the variables, and says whether it can save them', async () => {
  const { tokensJson } = await scratch();
  const app = await buildServer({ tokensJson });
  const answer = await app.inject({ method: 'GET', url: '/api/tokens' });
  assert.equal(answer.statusCode, 200);
  const body = answer.json();
  assert.equal(body.canSave, false);
  assert.ok(body.groups.some((group) => group.id === 'glass'));
});

test('saving is off unless the development server turns it on', async () => {
  const { tokensJson, tokensCss } = await scratch();
  const app = await buildServer({ tokensJson, tokensCss });
  const answer = await app.inject({ method: 'PUT', url: '/api/tokens', payload: { values: { '--lenzi-glass': '60%' } } });
  assert.equal(answer.statusCode, 403);
  assert.equal(answer.headers['content-type'], 'application/problem+json; charset=utf-8');
  assert.equal(answer.json().title, 'Saving is off');
});

test('the development server saves the values into the JSON and the CSS', async () => {
  const { tokensJson, tokensCss } = await scratch();
  const app = await buildServer({ tokensJson, tokensCss, allowSave: true });
  const answer = await app.inject({ method: 'PUT', url: '/api/tokens', payload: { values: { '--lenzi-glass': '60%', '--lenzi-border': '3px' } } });
  assert.equal(answer.statusCode, 200);
  const saved = JSON.parse(await readFile(tokensJson, 'utf8'));
  const glass = saved.groups.flatMap((g) => g.tokens).find((t) => t.name === '--lenzi-glass');
  assert.equal(glass.value, '60%');
  const css = await readFile(tokensCss, 'utf8');
  assert.match(css, /--lenzi-glass: 60%;/);
  assert.match(css, /--lenzi-border: 3px;/);
});

test('a wrong value is refused with what is wrong, and nothing is written', async () => {
  const { tokensJson, tokensCss } = await scratch();
  const before = await readFile(tokensJson, 'utf8');
  const app = await buildServer({ tokensJson, tokensCss, allowSave: true });
  const answer = await app.inject({ method: 'PUT', url: '/api/tokens', payload: { values: { '--lenzi-glass': '60%', '--lenzi-border': '2px; }' } } });
  assert.equal(answer.statusCode, 400);
  assert.deepEqual(answer.json().errors, [{ field: '--lenzi-border', message: 'not a length value' }]);
  assert.equal(await readFile(tokensJson, 'utf8'), before);
});

test('in production it serves the catalog, and any page address is its index.html', async () => {
  const { dir, tokensJson } = await scratch();
  const publicDir = join(dir, 'public');
  await mkdir(publicDir);
  await writeFile(join(publicDir, 'index.html'), '<app-root></app-root>');
  await writeFile(join(publicDir, 'main.js'), 'console.log(1)');
  const app = await buildServer({ publicDir, tokensJson });
  assert.equal((await app.inject({ method: 'GET', url: '/main.js' })).body, 'console.log(1)');
  const page = await app.inject({ method: 'GET', url: '/components/add-button' });
  assert.equal(page.statusCode, 200);
  assert.equal(page.body, '<app-root></app-root>');
  assert.equal(page.headers['x-content-type-options'], 'nosniff');
  assert.equal((await app.inject({ method: 'GET', url: '/api/nothing' })).statusCode, 404);
});

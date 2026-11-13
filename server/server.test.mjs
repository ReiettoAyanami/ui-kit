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

const ADMIN = { adminUser: 'lenzi', adminPassword: 'correct horse' };

/** Signs in and gives the Cookie header of the session. */
async function signIn(app, user = 'lenzi', password = 'correct horse') {
  const answer = await app.inject({ method: 'POST', url: '/api/session', payload: { user, password } });
  assert.equal(answer.statusCode, 200);
  return { cookie: answer.headers['set-cookie'].split(';')[0] };
}

test('gives the variables to everyone, and says whether whoever asks can save them', async () => {
  const { tokensJson } = await scratch();
  const app = await buildServer({ tokensJson, ...ADMIN });
  const answer = await app.inject({ method: 'GET', url: '/api/tokens' });
  assert.equal(answer.statusCode, 200);
  const body = answer.json();
  assert.equal(body.canSave, false);
  assert.ok(body.groups.some((group) => group.id === 'glass'));
  const headers = await signIn(app);
  assert.equal((await app.inject({ method: 'GET', url: '/api/tokens', headers })).json().canSave, true);
});

test('nobody saves without signing in; without an admin in the environment nobody can sign in', async () => {
  const { tokensJson, tokensCss } = await scratch();
  const before = await readFile(tokensJson, 'utf8');
  const app = await buildServer({ tokensJson, tokensCss, ...ADMIN });
  const answer = await app.inject({ method: 'PUT', url: '/api/tokens', payload: { values: { '--lenzi-glass': '60%' } } });
  assert.equal(answer.statusCode, 401);
  assert.equal(answer.headers['content-type'], 'application/problem+json; charset=utf-8');
  assert.equal(answer.json().title, 'Sign in first');

  const noAdmin = await buildServer({ tokensJson, tokensCss });
  assert.deepEqual((await noAdmin.inject({ method: 'GET', url: '/api/session' })).json(), { configured: false, signedIn: false, user: null, files: false });
  assert.equal((await noAdmin.inject({ method: 'POST', url: '/api/session', payload: { user: '', password: '' } })).statusCode, 403);
  const refused = await noAdmin.inject({ method: 'PUT', url: '/api/tokens', payload: { values: { '--lenzi-glass': '60%' } } });
  assert.equal(refused.statusCode, 403);
  assert.equal(refused.json().title, 'Saving is off');
  assert.equal(await readFile(tokensJson, 'utf8'), before);
});

test('the admin signs in with the user and the password, and out', async () => {
  const app = await buildServer({ ...ADMIN, allowFiles: true });
  const wrong = await app.inject({ method: 'POST', url: '/api/session', payload: { user: 'lenzi', password: 'nope' } });
  assert.equal(wrong.statusCode, 401);
  assert.equal(wrong.headers['set-cookie'], undefined);
  assert.equal((await app.inject({ method: 'POST', url: '/api/session', payload: { user: 'someone', password: 'correct horse' } })).statusCode, 401);

  const answer = await app.inject({ method: 'POST', url: '/api/session', payload: { user: 'lenzi', password: 'correct horse' } });
  assert.deepEqual(answer.json(), { configured: true, signedIn: true, user: 'lenzi', files: true });
  assert.match(answer.headers['set-cookie'], /^kit_session=[^;]+; Path=\/; HttpOnly; SameSite=Strict; Max-Age=604800$/);
  const cookie = answer.headers['set-cookie'].split(';')[0];
  assert.equal((await app.inject({ method: 'GET', url: '/api/session', headers: { cookie } })).json().signedIn, true);
  // a cookie that was changed, or signed with another password, is nobody's
  assert.equal((await app.inject({ method: 'GET', url: '/api/session', headers: { cookie: `${cookie}x` } })).json().signedIn, false);
  const other = await buildServer({ adminUser: 'lenzi', adminPassword: 'another' });
  assert.equal((await other.inject({ method: 'GET', url: '/api/session', headers: { cookie } })).json().signedIn, false);

  const out = await app.inject({ method: 'DELETE', url: '/api/session', headers: { cookie } });
  assert.match(out.headers['set-cookie'], /^kit_session=; .*Max-Age=0$/);
});

test('five wrong attempts, then a minute of nothing, even with the right password', async () => {
  const app = await buildServer(ADMIN);
  for (let i = 0; i < 5; i++) {
    assert.equal((await app.inject({ method: 'POST', url: '/api/session', payload: { user: 'lenzi', password: `guess ${i}` } })).statusCode, 401);
  }
  const locked = await app.inject({ method: 'POST', url: '/api/session', payload: { user: 'lenzi', password: 'correct horse' } });
  assert.equal(locked.statusCode, 429);
  assert.equal(locked.json().title, 'Too many attempts');
});

test('the admin saves the values into the JSON and the CSS', async () => {
  const { tokensJson, tokensCss } = await scratch();
  const app = await buildServer({ tokensJson, tokensCss, ...ADMIN });
  const headers = await signIn(app);
  const answer = await app.inject({ method: 'PUT', url: '/api/tokens', headers, payload: { values: { '--lenzi-glass': '60%', '--lenzi-border': '3px' } } });
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
  const app = await buildServer({ tokensJson, tokensCss, ...ADMIN });
  const headers = await signIn(app);
  const answer = await app.inject({ method: 'PUT', url: '/api/tokens', headers, payload: { values: { '--lenzi-glass': '60%', '--lenzi-border': '2px; }' } } });
  assert.equal(answer.statusCode, 400);
  assert.deepEqual(answer.json().errors, [{ field: '--lenzi-border', message: 'not a length value' }]);
  assert.equal(await readFile(tokensJson, 'utf8'), before);
});

test('with the values kept apart (Docker), the kit\'s file is never written and everyone gets the saved values', async () => {
  const { dir, tokensJson, tokensCss } = await scratch();
  const before = await readFile(tokensJson, 'utf8');
  const valuesPath = join(dir, 'data', 'variables.json');
  const app = await buildServer({ tokensJson, tokensCss, valuesPath, ...ADMIN });
  const headers = await signIn(app);
  assert.match((await app.inject({ method: 'GET', url: '/api/tokens.css' })).body, /--lenzi-glass: 56%;/);
  const answer = await app.inject({ method: 'PUT', url: '/api/tokens', headers, payload: { values: { '--lenzi-glass': '60%' } } });
  assert.equal(answer.statusCode, 200);
  assert.equal(await readFile(tokensJson, 'utf8'), before);
  assert.deepEqual(JSON.parse(await readFile(valuesPath, 'utf8')), { '--lenzi-glass': '60%' });

  // another server on the same volume (a new container): the values are still there, for everyone
  const again = await buildServer({ tokensJson, valuesPath });
  const tokens = (await again.inject({ method: 'GET', url: '/api/tokens' })).json();
  assert.equal(tokens.groups.flatMap((g) => g.tokens).find((t) => t.name === '--lenzi-glass').value, '60%');
  const css = await again.inject({ method: 'GET', url: '/api/tokens.css' });
  assert.equal(css.headers['content-type'], 'text/css; charset=utf-8');
  assert.match(css.body, /--lenzi-glass: 60%;/);

  // a kept value the kit no longer has, or no longer accepts, is left out
  await writeFile(valuesPath, JSON.stringify({ '--lenzi-gone': '1px', '--lenzi-glass': 'red; }', '--lenzi-border': '3px' }));
  const css2 = (await again.inject({ method: 'GET', url: '/api/tokens.css' })).body;
  assert.match(css2, /--lenzi-glass: 56%;/);
  assert.match(css2, /--lenzi-border: 3px;/);
  assert.doesNotMatch(css2, /--lenzi-gone/);
});

test('every save is kept, anyone reads the history, the admin undoes a save', async () => {
  const { dir, tokensJson, tokensCss } = await scratch();
  const kitDir = await scratchKit();
  const historyPath = join(dir, 'data', 'history.jsonl');
  const app = await buildServer({ tokensJson, tokensCss, kitDir, historyPath, allowFiles: true, ...ADMIN });
  const headers = await signIn(app);
  await app.inject({ method: 'PUT', url: '/api/tokens', headers, payload: { values: { '--lenzi-glass': '60%', '--lenzi-border': '2px' } } });
  await app.inject({ method: 'PUT', url: '/api/files', headers, payload: { path: 'libraries.json', content: '{"groups":[1]}\n' } });

  const { entries } = (await app.inject({ method: 'GET', url: '/api/history' })).json();
  assert.equal(entries.length, 2);
  const [file, variables] = entries;
  assert.equal(file.kind, 'file');
  assert.equal(file.path, 'libraries.json');
  assert.equal(file.before, undefined, 'the replaced text stays on the server');
  assert.equal(file.bytesBefore, 14);
  // only what changed: the border was already 2px
  assert.deepEqual(variables.changes, [{ name: '--lenzi-glass', from: '56%', to: '60%' }]);
  assert.equal(variables.user, 'lenzi');

  assert.equal((await app.inject({ method: 'POST', url: `/api/history/${variables.id}/restore` })).statusCode, 401);
  const undone = await app.inject({ method: 'POST', url: `/api/history/${variables.id}/restore`, headers });
  assert.equal(undone.statusCode, 200);
  assert.deepEqual(undone.json().entry.changes, [{ name: '--lenzi-glass', from: '60%', to: '56%' }]);
  assert.equal(undone.json().entry.restores, variables.id);
  assert.match(await readFile(tokensCss, 'utf8'), /--lenzi-glass: 56%;/);

  assert.equal((await app.inject({ method: 'POST', url: `/api/history/${file.id}/restore`, headers })).statusCode, 200);
  assert.equal(await readFile(join(kitDir, 'libraries.json'), 'utf8'), '{"groups":[]}\n');
  assert.equal((await app.inject({ method: 'GET', url: '/api/history' })).json().entries.length, 4);
  assert.equal((await app.inject({ method: 'POST', url: '/api/history/nothing/restore', headers })).statusCode, 404);
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

/** A copy of a few files of the kit in a folder of its own. */
async function scratchKit() {
  const dir = await mkdtemp(join(tmpdir(), 'kit-files-'));
  await mkdir(join(dir, 'src', 'lib', 'add-button'), { recursive: true });
  await mkdir(join(dir, 'src', 'styles'), { recursive: true });
  await writeFile(join(dir, 'src', 'lib', 'add-button', 'add-button.css'), ':host {}\n');
  await writeFile(join(dir, 'libraries.json'), '{"groups":[]}\n');
  await writeFile(join(dir, 'src', 'styles', 'tokens.css'), ':root {}\n');
  return dir;
}

/** A server that changes the kit's files, and the admin's session on it. */
async function filesServer(kitDir) {
  const app = await buildServer({ kitDir, allowFiles: true, ...ADMIN });
  const headers = await signIn(app);
  return { app, put: (body) => app.inject({ method: 'PUT', url: '/api/files', headers, payload: body }) };
}

test('the admin writes a file of the kit as it is given, where the server changes files', async () => {
  const kitDir = await scratchKit();
  const { app, put } = await filesServer(kitDir);
  assert.equal((await app.inject({ method: 'PUT', url: '/api/files', payload: { path: 'libraries.json', content: '{}' } })).statusCode, 401);
  const answer = await put({ path: 'src/lib/add-button/add-button.css', content: ':host { display: block; }\n' });
  assert.equal(answer.statusCode, 200);
  assert.equal(answer.json().path, 'src/lib/add-button/add-button.css');
  assert.equal(await readFile(join(kitDir, 'src', 'lib', 'add-button', 'add-button.css'), 'utf8'), ':host { display: block; }\n');
});

test('nothing outside the kit, nothing new, nothing generated, nothing but code', async () => {
  const kitDir = await scratchKit();
  const { put } = await filesServer(kitDir);
  for (const path of ['../server.mjs', '/etc/passwd', 'src/../../outside.ts', 'node_modules/x/index.ts', 'src/lib/new-piece/new.ts', 'src/styles/tokens.css', 'tools/run.sh']) {
    const answer = await put({ path, content: 'x' });
    assert.equal(answer.statusCode, 400, path);
    assert.equal(answer.json().title, 'This file cannot be changed', path);
  }
});

test('a JSON file must stay JSON; in Docker even the admin does not change files', async () => {
  const kitDir = await scratchKit();
  const { put } = await filesServer(kitDir);
  const broken = await put({ path: 'libraries.json', content: '{"groups": [' });
  assert.equal(broken.statusCode, 400);
  assert.equal(broken.json().title, 'Not valid JSON');
  assert.equal(await readFile(join(kitDir, 'libraries.json'), 'utf8'), '{"groups":[]}\n');

  const production = await buildServer({ kitDir, ...ADMIN });
  const headers = await signIn(production);
  assert.equal((await production.inject({ method: 'GET', url: '/api/session', headers })).json().files, false);
  const refused = await production.inject({ method: 'PUT', url: '/api/files', headers, payload: { path: 'libraries.json', content: '{}' } });
  assert.equal(refused.statusCode, 403);
  assert.equal(refused.json().title, 'Files are not changed here');
});

test('the admin chooses the pages the public sees; what a hidden page reads is refused to the public', async () => {
  const { dir, tokensJson } = await scratch();
  const publicDir = join(dir, 'public');
  await mkdir(join(publicDir, 'kit-src'), { recursive: true });
  await writeFile(join(publicDir, 'index.html'), '<app-root></app-root>');
  await writeFile(join(publicDir, 'kit-src', 'RULES.md'), '# Rules');
  await writeFile(join(publicDir, 'kit-src', 'AI-RULES.md'), '# AI rules');
  const pagesPath = join(dir, 'data', 'pages.json');
  const options = { publicDir, tokensJson, pagesPath, historyPath: join(dir, 'data', 'history.jsonl'), ...ADMIN };
  const app = await buildServer(options);
  assert.deepEqual((await app.inject({ method: 'GET', url: '/api/pages' })).json(), { hidden: [] });
  assert.equal((await app.inject({ method: 'GET', url: '/kit-src/RULES.md' })).statusCode, 200);

  const choice = { hidden: ['rules', 'history'], resources: ['kit-src/RULES.md', 'api/history'] };
  assert.equal((await app.inject({ method: 'PUT', url: '/api/pages', payload: choice })).statusCode, 401);
  const headers = await signIn(app);
  const saved = await app.inject({ method: 'PUT', url: '/api/pages', headers, payload: choice });
  assert.deepEqual(saved.json(), { hidden: ['history', 'rules'] });

  // the public: the hidden page's document and API are not there, the page's address is the catalog's (which says not found)
  assert.deepEqual((await app.inject({ method: 'GET', url: '/api/pages' })).json(), { hidden: ['history', 'rules'] });
  assert.equal((await app.inject({ method: 'GET', url: '/kit-src/RULES.md' })).statusCode, 404);
  assert.equal((await app.inject({ method: 'GET', url: '/kit-src/RULES.md?x=1' })).statusCode, 404);
  assert.equal((await app.inject({ method: 'GET', url: '/kit-src/%52ULES.md' })).statusCode, 404);
  assert.equal((await app.inject({ method: 'GET', url: '//kit-src/./x/..//RULES.md' })).statusCode, 404);
  assert.equal((await app.inject({ method: 'GET', url: '/api/history' })).statusCode, 404);
  assert.equal((await app.inject({ method: 'GET', url: '/kit-src/AI-RULES.md' })).statusCode, 200);
  assert.equal((await app.inject({ method: 'GET', url: '/rules' })).body, '<app-root></app-root>');
  // the admin still reads everything
  assert.equal((await app.inject({ method: 'GET', url: '/kit-src/RULES.md', headers })).statusCode, 200);
  assert.equal((await app.inject({ method: 'GET', url: '/api/history', headers })).statusCode, 200);

  // kept across a restart; nothing strange is accepted
  const again = await buildServer(options);
  assert.equal((await again.inject({ method: 'GET', url: '/kit-src/RULES.md' })).statusCode, 404);
  const strange = await app.inject({ method: 'PUT', url: '/api/pages', headers, payload: { hidden: ['rules'], resources: ['../server.mjs'] } });
  assert.equal(strange.statusCode, 400);
  assert.equal(strange.json().title, 'Invalid pages');
});

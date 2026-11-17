import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { EVERY_COMPONENT, choiceOf, createBackgrounds } from './backgrounds.mjs';
import { buildServer } from './server.mjs';

const ADMIN = { adminUser: 'lenzi', adminPassword: 'correct horse' };
const SCENE = { name: 'Dusk', blobs: [{ material: 'lamp', size: 0.2 }], fleets: [] };

/** A folder of its own, with the catalog's pages as its build writes them. */
async function scratch() {
  const dir = await mkdtemp(join(tmpdir(), 'kit-backgrounds-'));
  const sitePagesPath = join(dir, 'site-pages.json');
  await writeFile(
    sitePagesPath,
    JSON.stringify({
      pages: [
        { key: '', title: 'ui-kit', always: true, resources: [] },
        { key: 'components', title: 'Components', always: true, resources: [] },
        { key: 'rules', title: 'Rules', always: false, resources: ['kit-src/RULES.md'] },
        { key: 'components/add-button', title: 'Add button', always: true, resources: [] },
      ],
    }),
  );
  return {
    path: join(dir, 'data', 'backgrounds.json'),
    options: { ...ADMIN, sitePagesPath, pagesPath: join(dir, 'data', 'pages.json'), scenesPath: join(dir, 'data', 'scenes.json'), backgroundsPath: join(dir, 'data', 'backgrounds.json') },
  };
}

async function signIn(app) {
  const answer = await app.inject({ method: 'POST', url: '/api/session', payload: { user: 'lenzi', password: 'correct horse' } });
  return { cookie: answer.headers['set-cookie'].split(';')[0] };
}

test('a choice is no background, a scene of the code, a scene of the gallery; on a phone also "as on a computer"', () => {
  assert.equal(choiceOf(null), null);
  assert.deepEqual(choiceOf({ code: 'home' }), { code: 'home' });
  assert.deepEqual(choiceOf({ saved: 'aB3_-x9Z' }), { saved: 'aB3_-x9Z' });
  assert.equal(choiceOf('same', { phone: true }), 'same');
  for (const wrong of ['same', undefined, 'home', { code: 'Home!' }, { saved: '../x' }, { code: 'home', saved: 'x' }, { scene: {} }, []]) {
    assert.equal(choiceOf(wrong), undefined, JSON.stringify(wrong));
  }
});

test('keeps each page its background, in its file; what is not a choice is dropped when read again', async () => {
  const { path } = await scratch();
  const backgrounds = await createBackgrounds(path);
  assert.deepEqual(backgrounds.all(), {});
  assert.equal(backgrounds.invalid('', { computer: { code: 'home' }, phone: 'same' }), null);
  await backgrounds.set('', { computer: { code: 'home' }, phone: 'same' });
  await backgrounds.set(EVERY_COMPONENT, { computer: { saved: 'abcdefgh' }, phone: null });
  const again = await createBackgrounds(path);
  assert.deepEqual(again.all(), { '': { computer: { code: 'home' }, phone: 'same' }, [EVERY_COMPONENT]: { computer: { saved: 'abcdefgh' }, phone: null } });

  const stored = JSON.parse(await readFile(path, 'utf8'));
  stored.pages.rules = { computer: { colour: 'red' }, phone: null };
  stored.pages['../x'] = { computer: null, phone: null };
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, JSON.stringify(stored));
  assert.deepEqual(Object.keys((await createBackgrounds(path)).all()).sort(), ['', EVERY_COMPONENT]);
});

test('everyone reads the backgrounds, with the gallery\'s scenes they name; only the admin chooses', async () => {
  const { options } = await scratch();
  const app = await buildServer(options);
  assert.deepEqual((await app.inject({ method: 'GET', url: '/api/backgrounds' })).json(), { pages: {} });

  const choice = { page: 'rules', computer: { code: 'home' }, phone: 'same' };
  assert.equal((await app.inject({ method: 'PUT', url: '/api/backgrounds', payload: choice })).statusCode, 401);

  const headers = await signIn(app);
  const dusk = (await app.inject({ method: 'POST', url: '/api/scenes', headers, payload: { scene: SCENE } })).json();
  const saved = await app.inject({ method: 'PUT', url: '/api/backgrounds', headers, payload: { page: '', computer: { saved: dusk.id }, phone: null } });
  assert.equal(saved.statusCode, 200);
  assert.deepEqual(saved.json().pages[''], { computer: { saved: dusk.id, name: 'Dusk', scene: SCENE }, phone: null });
  await app.inject({ method: 'PUT', url: '/api/backgrounds', headers, payload: choice });
  await app.inject({ method: 'PUT', url: '/api/backgrounds', headers, payload: { page: EVERY_COMPONENT, computer: { code: 'home' }, phone: { code: 'home-phone' } } });

  // a visitor: the scene of the gallery whole (it cannot read the gallery itself)
  const shown = (await app.inject({ method: 'GET', url: '/api/backgrounds' })).json().pages;
  assert.deepEqual(shown[''].computer, { saved: dusk.id, name: 'Dusk', scene: SCENE });
  assert.deepEqual(shown.rules, { computer: { code: 'home' }, phone: 'same' });
  assert.deepEqual(shown[EVERY_COMPONENT].phone, { code: 'home-phone' });
  assert.equal((await app.inject({ method: 'GET', url: '/api/scenes' })).statusCode, 401);

  // a hidden page's background is the admin's alone
  await app.inject({ method: 'PUT', url: '/api/pages', headers, payload: { hidden: ['rules'] } });
  assert.equal('rules' in (await app.inject({ method: 'GET', url: '/api/backgrounds' })).json().pages, false);
  assert.equal('rules' in (await app.inject({ method: 'GET', url: '/api/backgrounds', headers })).json().pages, true);

  // a scene taken out of the gallery: said, so the page has the catalog's own again; put back, it is there again
  await app.inject({ method: 'DELETE', url: `/api/scenes/${dusk.id}`, headers });
  assert.deepEqual((await app.inject({ method: 'GET', url: '/api/backgrounds' })).json().pages[''].computer, { saved: dusk.id, missing: true });
  await app.inject({ method: 'POST', url: `/api/scenes/${dusk.id}/restore`, headers });
  assert.equal((await app.inject({ method: 'GET', url: '/api/backgrounds' })).json().pages[''].computer.name, 'Dusk');

  // kept across a restart
  const later = await buildServer(options);
  assert.deepEqual(Object.keys((await later.inject({ method: 'GET', url: '/api/backgrounds', headers: await signIn(later) })).json().pages).sort(), ['', EVERY_COMPONENT, 'rules']);
});

test('what is not a page, or not a choice, is refused in the API\'s words', async () => {
  const { options } = await scratch();
  const app = await buildServer(options);
  const headers = await signIn(app);
  const put = (payload) => app.inject({ method: 'PUT', url: '/api/backgrounds', headers, payload });
  for (const [payload, words] of [
    [{ page: 'nowhere', computer: null, phone: null }, /Not a page/],
    [{ page: '../admin', computer: null, phone: null }, /Not a page/],
    [{ page: 'rules', computer: 'same', phone: null }, /On a computer/],
    [{ page: 'rules', computer: { code: 'home' }, phone: { colour: '#fff' } }, /On a phone/],
  ]) {
    const answer = await put(payload);
    assert.equal(answer.statusCode, 400, JSON.stringify(payload));
    assert.equal(answer.json().type, 'urn:ui-kit:problem:invalid-background');
    assert.match(answer.json().detail, words);
  }
  assert.equal((await put({ page: 'rules', computer: null })).statusCode, 400);
});

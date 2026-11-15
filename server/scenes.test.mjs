import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SCENE_STORE_LIMITS, createScenes, invalidScene } from './scenes.mjs';
import { buildServer } from './server.mjs';

const SCENE = { name: 'Dusk', blobs: [{ material: 'lamp', size: 0.2 }], fleets: [{ kind: 'boid', count: 80 }] };

/** A file of its own for each test, and a clock that moves a second at every look. */
async function scratch() {
  const path = join(await mkdtemp(join(tmpdir(), 'kit-scenes-')), 'data', 'scenes.json');
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 10, 15, 12, 0, tick++));
  return { path, now };
}

test('a scene needs its two lists, within what a scene may hold', () => {
  assert.equal(invalidScene(SCENE), null);
  assert.equal(invalidScene({ blobs: [], fleets: [] }), null);
  assert.match(invalidScene(null), /object/);
  assert.match(invalidScene([]), /object/);
  assert.match(invalidScene({ blobs: [] }), /blobs and fleets/);
  assert.match(invalidScene({ blobs: Array(SCENE_STORE_LIMITS.blobs + 1).fill({}), fleets: [] }), /blobs at most/);
  assert.match(invalidScene({ blobs: [], fleets: Array(SCENE_STORE_LIMITS.fleets + 1).fill({}) }), /fleets at most/);
  assert.match(invalidScene({ blobs: ['lamp'], fleets: [] }), /is an object/);
  assert.match(invalidScene({ blobs: [], fleets: [], currents: 'east' }), /currents/);
  assert.match(invalidScene({ blobs: [], fleets: [], name: 'x'.repeat(SCENE_STORE_LIMITS.name + 1) }), /name/);
  assert.match(invalidScene({ blobs: [{ note: 'x'.repeat(SCENE_STORE_LIMITS.bytes) }], fleets: [] }), /too large/);
});

test('keeps scenes in its file, the last saved first, and changes one by its id', async () => {
  const { path, now } = await scratch();
  const scenes = createScenes(path, { now });
  assert.deepEqual(await scenes.list(), []);

  const dusk = await scenes.add(SCENE);
  assert.match(dusk.id, /^[A-Za-z0-9_-]{8}$/);
  assert.equal(dusk.name, 'Dusk');
  assert.deepEqual(dusk.scene, SCENE);
  assert.equal(dusk.createdAt, dusk.updatedAt);
  const noon = await scenes.add({ blobs: [], fleets: [] });
  assert.equal(noon.name, '');
  assert.deepEqual((await scenes.list()).map((scene) => scene.id), [noon.id, dusk.id]);

  const changed = await scenes.update(dusk.id, { ...SCENE, name: '  Dawn ' });
  assert.equal(changed.name, 'Dawn');
  assert.equal(changed.createdAt, dusk.createdAt);
  assert.ok(changed.updatedAt > dusk.updatedAt);
  assert.deepEqual((await scenes.list()).map((scene) => scene.id), [dusk.id, noon.id]);
  assert.equal(await scenes.update('nothing', SCENE), null);

  // another server on the same file reads what was kept
  const again = createScenes(path);
  assert.deepEqual(await again.list(), await scenes.list());
});

test('a scene taken out is marked, not erased, and can be put back', async () => {
  const { path, now } = await scratch();
  const scenes = createScenes(path, { now });
  const dusk = await scenes.add(SCENE);
  assert.equal(await scenes.remove(dusk.id), true);
  assert.deepEqual(await scenes.list(), []);
  assert.equal(await scenes.remove(dusk.id), false);
  assert.equal(await scenes.update(dusk.id, SCENE), null);

  const kept = JSON.parse(await readFile(path, 'utf8')).scenes;
  assert.equal(kept.length, 1);
  assert.equal(kept[0].id, dusk.id);
  assert.ok(kept[0].deletedAt);

  const back = await scenes.restore(dusk.id);
  assert.equal(back.id, dusk.id);
  assert.equal(back.deletedAt, undefined);
  assert.deepEqual((await scenes.list()).map((scene) => scene.id), [dusk.id]);
  assert.equal(await scenes.restore(dusk.id), null);
});

test('the gallery is full at its limit; the oldest taken-out scenes go first', async () => {
  const { now } = await scratch();
  const scenes = createScenes(null, { now });
  const ids = [];
  for (let i = 0; i < SCENE_STORE_LIMITS.scenes; i++) ids.push((await scenes.add({ blobs: [], fleets: [] })).id);
  assert.equal(await scenes.full(), true);
  assert.equal(await scenes.add(SCENE), null);
  for (const id of ids.slice(0, SCENE_STORE_LIMITS.removed + 1)) assert.equal(await scenes.remove(id), true);
  // the first one taken out is gone for good, the next still comes back
  assert.equal(await scenes.restore(ids[0]), null);
  assert.equal((await scenes.restore(ids[1])).id, ids[1]);
});

const ADMIN = { adminUser: 'lenzi', adminPassword: 'correct horse' };

async function signIn(app) {
  const answer = await app.inject({ method: 'POST', url: '/api/session', payload: { user: 'lenzi', password: 'correct horse' } });
  assert.equal(answer.statusCode, 200);
  return { cookie: answer.headers['set-cookie'].split(';')[0] };
}

test('the scenes are the admin\'s alone: a visitor reads and changes none', async () => {
  const { path } = await scratch();
  const app = await buildServer({ ...ADMIN, scenesPath: path });
  const headers = await signIn(app);
  const kept = (await app.inject({ method: 'POST', url: '/api/scenes', headers, payload: { scene: SCENE } })).json();

  for (const request of [
    { method: 'GET', url: '/api/scenes' },
    { method: 'POST', url: '/api/scenes', payload: { scene: SCENE } },
    { method: 'PUT', url: `/api/scenes/${kept.id}`, payload: { scene: SCENE } },
    { method: 'DELETE', url: `/api/scenes/${kept.id}` },
    { method: 'POST', url: `/api/scenes/${kept.id}/restore` },
  ]) {
    const answer = await app.inject(request);
    assert.equal(answer.statusCode, 401, `${request.method} ${request.url}`);
    assert.equal(answer.json().title, 'Sign in first');
  }
  assert.equal((await app.inject({ method: 'GET', url: '/api/scenes', headers })).json().scenes.length, 1);
});

test('the admin keeps a scene, changes it, takes it out and puts it back', async () => {
  const { path } = await scratch();
  const app = await buildServer({ ...ADMIN, scenesPath: path });
  const headers = await signIn(app);

  const made = await app.inject({ method: 'POST', url: '/api/scenes', headers, payload: { scene: SCENE } });
  assert.equal(made.statusCode, 201);
  const kept = made.json();
  assert.equal(kept.name, 'Dusk');
  assert.deepEqual(kept.scene, SCENE);

  const changed = await app.inject({ method: 'PUT', url: `/api/scenes/${kept.id}`, headers, payload: { scene: { ...SCENE, name: 'Dawn', throwable: true } } });
  assert.equal(changed.statusCode, 200);
  assert.equal(changed.json().name, 'Dawn');
  assert.equal(changed.json().scene.throwable, true);
  assert.deepEqual((await app.inject({ method: 'GET', url: '/api/scenes', headers })).json().scenes.map((scene) => scene.name), ['Dawn']);

  assert.equal((await app.inject({ method: 'DELETE', url: `/api/scenes/${kept.id}`, headers })).statusCode, 204);
  assert.deepEqual((await app.inject({ method: 'GET', url: '/api/scenes', headers })).json().scenes, []);
  const gone = await app.inject({ method: 'DELETE', url: `/api/scenes/${kept.id}`, headers });
  assert.equal(gone.statusCode, 404);
  assert.equal(gone.json().title, 'No such scene');

  const back = await app.inject({ method: 'POST', url: `/api/scenes/${kept.id}/restore`, headers });
  assert.equal(back.statusCode, 200);
  assert.equal(back.json().id, kept.id);
  assert.equal((await app.inject({ method: 'GET', url: '/api/scenes', headers })).json().scenes.length, 1);

  // kept in the file: a new server (a new image on the same volume) still has it
  const next = await buildServer({ ...ADMIN, scenesPath: path });
  assert.equal((await next.inject({ method: 'GET', url: '/api/scenes', headers: await signIn(next) })).json().scenes[0].name, 'Dawn');
});

test('what is not a scene is refused, in the API\'s words', async () => {
  const app = await buildServer({ ...ADMIN });
  const headers = await signIn(app);
  const refused = await app.inject({ method: 'POST', url: '/api/scenes', headers, payload: { scene: { blobs: [] } } });
  assert.equal(refused.statusCode, 400);
  assert.equal(refused.headers['content-type'], 'application/problem+json; charset=utf-8');
  assert.equal(refused.json().title, 'Invalid scene');
  assert.equal((await app.inject({ method: 'POST', url: '/api/scenes', headers, payload: {} })).statusCode, 400);
  const missing = await app.inject({ method: 'PUT', url: '/api/scenes/nothing', headers, payload: { scene: SCENE } });
  assert.equal(missing.statusCode, 404);
  assert.equal((await app.inject({ method: 'PUT', url: '/api/scenes/nothing', headers, payload: { scene: 'x' } })).statusCode, 400);
});

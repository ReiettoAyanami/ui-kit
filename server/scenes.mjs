// The scenes the admin keeps (lenzi, 2026-11-14: "la sezione admin puó creare varie scene, quindi la sezione
// scene lo porta a quelle salvate (una galleria con le varie scene ...)"): each a scene as the catalog's scene
// maker makes it (LenziScene, plain JSON), with a short id, a name and when it was saved. Kept in one JSON
// file (Docker: on the volume, apart from the image). A scene taken out is not erased: it is marked
// (`deletedAt`) and left out of the list, so it can be put back. A plain Node module, no dependencies.

import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/** How much is kept: scenes in the gallery, taken-out ones behind them, and how large one scene's JSON may be. */
export const SCENE_STORE_LIMITS = { scenes: 200, removed: 100, bytes: 64 * 1024, name: 60, blobs: 16, fleets: 8, currents: 4 };

const record = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : null);

/**
 * What is wrong with a scene, or null. Its shape and its size only: the catalog checks every value and
 * keeps it within bounds when it reads a scene (shared/scene-code.ts, `cleanScene`), wherever it comes from.
 */
export function invalidScene(scene) {
  const body = record(scene);
  if (!body) return 'A scene is an object with its blobs and its fleets.';
  if (!Array.isArray(body.blobs) || !Array.isArray(body.fleets)) return 'A scene has blobs and fleets (two lists).';
  if (body.blobs.length > SCENE_STORE_LIMITS.blobs) return `A scene holds ${SCENE_STORE_LIMITS.blobs} blobs at most.`;
  if (body.fleets.length > SCENE_STORE_LIMITS.fleets) return `A scene holds ${SCENE_STORE_LIMITS.fleets} fleets at most.`;
  if (![...body.blobs, ...body.fleets].every(record)) return 'Every blob and every fleet is an object.';
  if (body.currents !== undefined && (!Array.isArray(body.currents) || body.currents.length > SCENE_STORE_LIMITS.currents || !body.currents.every(record))) {
    return `A scene holds ${SCENE_STORE_LIMITS.currents} currents at most (a list).`;
  }
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.length > SCENE_STORE_LIMITS.name)) {
    return `A scene's name is ${SCENE_STORE_LIMITS.name} characters at most.`;
  }
  if (Buffer.byteLength(JSON.stringify(body)) > SCENE_STORE_LIMITS.bytes) return 'This scene is too large to keep.';
  return null;
}

/** A scene as the gallery gets it: without what only the file keeps. */
function shown({ deletedAt: _deletedAt, ...scene }) {
  return scene;
}

/**
 * @param {string | null} path where the scenes are kept; null: only while the server runs
 * @param {object} [options]
 * @param {() => Date} [options.now]
 * @param {() => string} [options.newId]
 */
export function createScenes(path, { now = () => new Date(), newId = () => randomBytes(6).toString('base64url') } = {}) {
  /** Every scene, the taken-out ones too; read once, then kept here and written after each change. */
  let all = null;
  /** One change at a time: two saves never write over each other. */
  let queue = Promise.resolve();

  async function load() {
    if (all) return all;
    const stored = path ? await readFile(path, 'utf8').then(JSON.parse).catch(() => null) : null;
    all = Array.isArray(stored?.scenes) ? stored.scenes.filter((entry) => record(entry) && typeof entry.id === 'string' && !invalidScene(entry.scene)) : [];
    return all;
  }

  /** Runs a change after the ones before it, and writes the file when it changed something. */
  function change(run) {
    const done = queue.then(async () => {
      const scenes = await load();
      const result = await run(scenes);
      if (result !== null && path) {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, `${JSON.stringify({ scenes: all }, null, 2)}\n`);
      }
      return result;
    });
    queue = done.catch(() => undefined);
    return done;
  }

  const live = (scenes) => scenes.filter((entry) => !entry.deletedAt);
  const nameOf = (scene) => (typeof scene.name === 'string' ? scene.name.trim() : '');

  return {
    /** The scenes kept, the last saved first. */
    async list() {
      return live(await load())
        .map(shown)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    /** Whether one more scene can be kept. */
    async full() {
      return live(await load()).length >= SCENE_STORE_LIMITS.scenes;
    },

    /** Keeps a new scene and gives it back with its id; null when the gallery is full. */
    add(scene) {
      return change((scenes) => {
        if (live(scenes).length >= SCENE_STORE_LIMITS.scenes) return null;
        const at = now().toISOString();
        let id = newId();
        while (scenes.some((entry) => entry.id === id)) id = newId();
        const entry = { id, name: nameOf(scene), scene, createdAt: at, updatedAt: at };
        scenes.push(entry);
        return shown(entry);
      });
    },

    /** A kept scene, changed; null when it is not there. */
    update(id, scene) {
      return change((scenes) => {
        const entry = live(scenes).find((found) => found.id === id);
        if (!entry) return null;
        entry.scene = scene;
        entry.name = nameOf(scene);
        entry.updatedAt = now().toISOString();
        return shown(entry);
      });
    },

    /** Takes a scene out of the gallery (marked, not erased); false when it is not there. */
    remove(id) {
      return change((scenes) => {
        const entry = live(scenes).find((found) => found.id === id);
        if (!entry) return null;
        entry.deletedAt = now().toISOString();
        // the taken-out ones are kept for a while: the oldest go first
        const removed = scenes.filter((found) => found.deletedAt).sort((a, b) => a.deletedAt.localeCompare(b.deletedAt));
        for (const old of removed.slice(0, Math.max(0, removed.length - SCENE_STORE_LIMITS.removed))) scenes.splice(scenes.indexOf(old), 1);
        return true;
      }).then((done) => done === true);
    },

    /** Puts a taken-out scene back; null when it is not there (or the gallery is full). */
    restore(id) {
      return change((scenes) => {
        const entry = scenes.find((found) => found.id === id && found.deletedAt);
        if (!entry || live(scenes).length >= SCENE_STORE_LIMITS.scenes) return null;
        delete entry.deletedAt;
        return shown(entry);
      });
    },
  };
}

// The kit's server (Fastify, like the apps' APIs). Everyone reads; only the admin changes (lenzi,
// 2026-11-12: "pagina admin per abilitare la modifica (unico utente). L'endpoint pubblico mostra solo
// le info."): one user and one password from the environment (auth.mjs), signed in on the catalog's
// Admin page. Two jobs:
// - development (`npm start`, tools/dev.mjs): the admin saves the variables into
//   projects/kit/src/styles/tokens.json and tokens.css, and the kit's files (KIT_ALLOW_FILES=true);
// - production (Docker): it serves the built catalog, every unknown address answered by index.html
//   (the catalog routes in the browser). The admin changes the variables on the fly (lenzi,
//   2026-11-13): they are kept apart from the image (TOKENS_VALUES, on a volume) and every visitor
//   gets them (/api/tokens.css). The kit's files need a new build, so they are not changed there.
// Every save is kept (history.mjs) and can be undone. The admin also chooses which pages the public
// sees (pages.mjs): the catalog itself is always public; of everything else the public gets only what
// a public page reads (closed by default, from the pages the build wrote down). And the admin keeps
// scenes (scenes.mjs): the gallery of the catalog's Scenes page, the admin's alone; and chooses each page's
// background (backgrounds.mjs), which everyone reads, with the scenes of the gallery it names.
import Fastify from 'fastify';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, posix, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAuth, sessionCookie } from './auth.mjs';
import { createBackgrounds } from './backgrounds.mjs';
import { createHistory, publicEntry } from './history.mjs';
import { createPages } from './pages.mjs';
import { SCENE_STORE_LIMITS, createScenes, invalidScene } from './scenes.mjs';
import { TOKENS_CSS, TOKENS_JSON, applyValues, renderCss, readTokens, tokensByName, writeTokens } from './tokens.mjs';

/** The kit's folder in this workspace: the only place the catalog may write into. */
export const KIT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'projects', 'kit');

/** What the catalog may change: code and documents. Never a new file, never a generated one. */
const EDITABLE = new Set(['.ts', '.cts', '.html', '.css', '.scss', '.md', '.json']);
const GENERATED = new Set(['src/styles/tokens.css', 'src/styles/tokens.json']);
const MAX_BYTES = 512 * 1024;

/** Why a file cannot be written, or null with its absolute path. */
async function editablePath(kitDir, path) {
  if (typeof path !== 'string' || path === '' || path.includes('\0')) return { reason: 'No file given.' };
  const absolute = resolve(kitDir, path);
  if (!absolute.startsWith(resolve(kitDir) + sep)) return { reason: 'Only the files of the kit (projects/kit) can be changed.' };
  const relative = absolute.slice(resolve(kitDir).length + 1).split(sep).join('/');
  if (relative.split('/').includes('node_modules')) return { reason: 'Only the files of the kit (projects/kit) can be changed.' };
  if (GENERATED.has(relative)) return { reason: 'The variables are changed on the Variables page (tokens.css is generated from tokens.json).' };
  if (!EDITABLE.has(extname(absolute))) return { reason: `A ${extname(absolute) || 'file without extension'} cannot be changed here.` };
  const info = await stat(absolute).catch(() => null);
  if (!info?.isFile()) return { reason: `There is no file ${relative} in the kit: the catalog changes files, it does not make new ones.` };
  return { absolute, relative };
}

/** A Problem Details answer (RFC 9457), the shape every API of the kit's apps answers with. */
function problem(reply, status, code, title, detail, errors = []) {
  return reply
    .code(status)
    .type('application/problem+json')
    .send({ type: `urn:ui-kit:problem:${code}`, title, status, detail, errors });
}

/**
 * @param {object} options
 * @param {string | null} [options.publicDir] the built catalog to serve (none in development)
 * @param {string} [options.tokensJson] the variables as the kit has them
 * @param {string} [options.tokensCss] the CSS written from them (development)
 * @param {string | null} [options.valuesPath] where saved values are kept apart from tokensJson, which
 *   is then never written (Docker: the image's variables, and the admin's changes on a volume)
 * @param {string} [options.kitDir] the kit's folder
 * @param {boolean} [options.allowFiles] the admin may change the kit's files too (development)
 * @param {string} [options.adminUser] @param {string} [options.adminPassword] without both, nobody can save
 * @param {string | null} [options.historyPath] where the saves are kept (none: not kept)
 * @param {string | null} [options.pagesPath] where the pages hidden from the public are kept
 * @param {string | null} [options.sitePagesPath] the catalog's pages, written by its build (`npm run pages`):
 *   with it the public reads only what the public pages read; without it (development) nothing is refused
 * @param {string | null} [options.scenesPath] where the admin's scenes are kept (none: only while it runs)
 * @param {string | null} [options.backgroundsPath] where the pages' backgrounds are kept (none: only while it runs)
 * @param {boolean} [options.trustProxy] behind a reverse proxy: its word on https and on the address
 * @param {boolean} [options.logger]
 */
export async function buildServer({
  publicDir = null,
  tokensJson = TOKENS_JSON,
  tokensCss = TOKENS_CSS,
  valuesPath = null,
  kitDir = KIT_DIR,
  allowFiles = false,
  adminUser = '',
  adminPassword = '',
  historyPath = null,
  pagesPath = null,
  sitePagesPath = null,
  scenesPath = null,
  backgroundsPath = null,
  trustProxy = false,
  logger = false,
} = {}) {
  const app = Fastify({ logger, trustProxy });
  const auth = createAuth({ user: adminUser, password: adminPassword });
  const history = createHistory(historyPath);
  const pages = await createPages({ path: pagesPath, sitePagesPath });
  const scenes = createScenes(scenesPath);
  const backgrounds = await createBackgrounds(backgroundsPath);

  const signedIn = (request) => auth.signedIn(request.headers.cookie);
  /** Answers why not and gives false, unless the admin is signed in. */
  function adminOnly(request, reply) {
    if (signedIn(request)) return true;
    if (!auth.configured) {
      problem(reply, 403, 'save-disabled', 'Saving is off', 'This server has no admin: set KIT_ADMIN_USER and KIT_ADMIN_PASSWORD in its environment (.env) and start it again.');
    } else {
      problem(reply, 401, 'sign-in-required', 'Sign in first', 'Only the admin changes the kit: sign in on the Admin page.');
    }
    return false;
  }

  /** The variables as they are now: the kit's, with the values saved apart (the ones still valid). */
  async function currentTokens() {
    const document = await readTokens(tokensJson);
    if (!valuesPath) return document;
    const saved = await readFile(valuesPath, 'utf8').then(JSON.parse).catch(() => ({}));
    const known = tokensByName(document);
    const valid = Object.fromEntries(Object.entries(saved).filter(([name, value]) => known.has(name) && applyValues(document, { [name]: value }).document));
    return applyValues(document, valid).document;
  }

  /** Keeps the document: in the kit's files, or (apart) only what differs from them. */
  async function storeTokens(document) {
    if (!valuesPath) return writeTokens(document, tokensJson, tokensCss);
    const kit = tokensByName(await readTokens(tokensJson));
    const values = {};
    for (const [name, token] of tokensByName(document)) if (kit.get(name)?.value !== token.value) values[name] = token.value;
    await mkdir(dirname(valuesPath), { recursive: true });
    await writeFile(valuesPath, `${JSON.stringify(values, null, 2)}\n`);
  }

  /** Saves the values and keeps the save: the answer for the page, or the problem. */
  async function saveValues(request, reply, values, restores = null) {
    const before = await currentTokens();
    const result = applyValues(before, values);
    if (result.errors) {
      return problem(
        reply,
        400,
        'invalid-variables',
        'Invalid variables',
        'Some values cannot be saved.',
        result.errors.map((error) => ({ field: error.name, message: error.reason })),
      );
    }
    const was = tokensByName(before);
    const changes = [...tokensByName(result.document)]
      .filter(([name, token]) => was.get(name).value !== token.value)
      .map(([name, token]) => ({ name, from: was.get(name).value, to: token.value }));
    await storeTokens(result.document);
    const entry = changes.length ? await history.add({ kind: 'variables', changes }, { user: auth.user, restores }) : null;
    return { ...result.document, canSave: true, entry: entry && publicEntry(entry) };
  }

  /** Writes a file of the kit and keeps the save (with the text it replaced). */
  async function saveFile(target, content, restores = null) {
    const before = await readFile(target.absolute, 'utf8');
    await writeFile(target.absolute, content);
    if (before === content) return null;
    return history.add(
      { kind: 'file', path: target.relative, before, bytesBefore: Buffer.byteLength(before), bytesAfter: Buffer.byteLength(content) },
      { user: auth.user, restores },
    );
  }

  // A few headers every page of the kit's apps sends.
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'same-origin');
  });

  // Closed by default: the kit's files (kit-src/) and what the pages read (an API) exist for the public
  // only when a public page reads them. The documents of a hidden page, a file no page shows: the admin's.
  app.addHook('onRequest', async (request, reply) => {
    let resource;
    try {
      // as the file server will read it: "/kit-src//./RULES.md" is RULES.md too
      resource = posix.normalize(decodeURIComponent(request.url.split('?')[0])).replace(/^\/+/, '');
    } catch {
      return;
    }
    if (pages.refuses(resource) && !signedIn(request)) {
      return problem(reply, 404, 'not-found', 'Not found', `Nothing at ${request.method} /${resource}.`);
    }
  });

  app.get('/api/health', async () => ({ ok: true }));

  // The pages hidden from the public: everyone asks (the catalog leaves them out), the admin chooses.
  app.get('/api/pages', async () => ({ hidden: pages.hidden() }));

  app.put(
    '/api/pages',
    {
      schema: {
        body: {
          type: 'object',
          required: ['hidden'],
          properties: { hidden: { type: 'array', items: { type: 'string' } } },
        },
      },
    },
    async (request, reply) => {
      if (!adminOnly(request, reply)) return reply;
      const reason = pages.invalid(request.body.hidden);
      if (reason) return problem(reply, 400, 'invalid-pages', 'Invalid pages', reason);
      return { hidden: await pages.set(request.body.hidden) };
    },
  );

  // Who is looking: whether an admin exists here, whether this browser is signed in as it, and whether
  // this server changes the kit's files too (the catalog's editors save, or only show).
  const session = (request) => ({ configured: auth.configured, signedIn: signedIn(request), user: signedIn(request) ? auth.user : null, files: allowFiles });
  app.get('/api/session', async (request) => session(request));

  app.post(
    '/api/session',
    {
      schema: {
        body: {
          type: 'object',
          required: ['user', 'password'],
          properties: { user: { type: 'string', maxLength: 200 }, password: { type: 'string', maxLength: 1000 } },
        },
      },
    },
    async (request, reply) => {
      if (!auth.configured) {
        return problem(reply, 403, 'save-disabled', 'No admin on this server', 'Set KIT_ADMIN_USER and KIT_ADMIN_PASSWORD in its environment (.env) and start it again.');
      }
      const wait = auth.locked(request.ip);
      if (wait > 0) {
        reply.header('Retry-After', wait);
        return problem(reply, 429, 'too-many-attempts', 'Too many attempts', `Try again in ${wait} seconds.`);
      }
      const made = auth.signIn(request.ip, request.body.user, request.body.password);
      if (!made) return problem(reply, 401, 'wrong-credentials', 'Wrong user or password', 'Check them and try again.');
      reply.header('Set-Cookie', sessionCookie(made.token, made.maxAge, request.protocol === 'https'));
      return { configured: true, signedIn: true, user: auth.user, files: allowFiles };
    },
  );

  app.delete('/api/session', async (request, reply) => {
    reply.header('Set-Cookie', sessionCookie('', 0, request.protocol === 'https'));
    return { configured: auth.configured, signedIn: false, user: null, files: allowFiles };
  });

  // A file of the kit, changed in the catalog's editor (its Code tab, libraries.json): written as it is,
  // and the development server rebuilds the catalog with it. Development only.
  app.put(
    '/api/files',
    {
      bodyLimit: MAX_BYTES * 2,
      schema: {
        body: {
          type: 'object',
          required: ['path', 'content'],
          properties: { path: { type: 'string' }, content: { type: 'string', maxLength: MAX_BYTES } },
        },
      },
    },
    async (request, reply) => {
      if (!adminOnly(request, reply)) return reply;
      if (!allowFiles) {
        return problem(reply, 403, 'files-not-here', 'Files are not changed here', 'This server changes the variables only. The kit\'s files change on the development server (npm start), and a new build shows them.');
      }
      const { path, content } = request.body;
      const target = await editablePath(kitDir, path);
      if (!target.absolute) return problem(reply, 400, 'not-editable', 'This file cannot be changed', target.reason);
      if (target.relative.endsWith('.json')) {
        try {
          JSON.parse(content);
        } catch (error) {
          return problem(reply, 400, 'invalid-json', 'Not valid JSON', `${target.relative}: ${error.message}`);
        }
      }
      const entry = await saveFile(target, content);
      return { path: target.relative, entry: entry && publicEntry(entry) };
    },
  );

  // The variables as they are now, and whether whoever asks can save them. While the Variables page is
  // hidden the public gets their names and values only (a component's page still shows the ones it
  // uses): what each is for and why, the page's content, stays the admin's.
  app.get('/api/tokens', async (request) => {
    const document = await currentTokens();
    if (signedIn(request) || !pages.isHidden('variables')) return { ...document, canSave: signedIn(request) };
    return {
      about: '',
      groups: document.groups.map((group) => ({
        id: group.id,
        label: group.label,
        description: '',
        tokens: group.tokens.map(({ description: _description, why: _why, ...token }) => ({ ...token, description: '', why: '' })),
      })),
      canSave: false,
    };
  });

  // The same as CSS: every page of the catalog loads it after its own styles, so what the admin saved
  // on a server that keeps the values apart is what every visitor sees, without a new build.
  app.get('/api/tokens.css', async (_request, reply) => reply.type('text/css; charset=utf-8').header('Cache-Control', 'no-cache').send(renderCss(await currentTokens())));

  app.put(
    '/api/tokens',
    {
      schema: {
        body: {
          type: 'object',
          required: ['values'],
          properties: { values: { type: 'object', additionalProperties: { type: 'string' } } },
        },
      },
    },
    async (request, reply) => {
      if (!adminOnly(request, reply)) return reply;
      return saveValues(request, reply, request.body.values);
    },
  );

  // Every save, the newest first: what changed and when, for everyone (without the replaced texts).
  app.get('/api/history', async () => ({ entries: (await history.read()).reverse().map(publicEntry) }));

  // A save undone: the variables back to what they were before it, the file back to the text it
  // replaced. It is a save too, kept like the others (so it can be undone in its turn).
  app.post('/api/history/:id/restore', async (request, reply) => {
    if (!adminOnly(request, reply)) return reply;
    const entry = await history.find(request.params.id);
    if (!entry) return problem(reply, 404, 'not-found', 'No such save', 'It is not in the history any more.');
    if (entry.kind === 'variables') {
      const known = tokensByName(await currentTokens());
      const values = Object.fromEntries(entry.changes.filter((change) => known.has(change.name)).map((change) => [change.name, change.from]));
      const answer = await saveValues(request, reply, values, entry.id);
      return answer === reply ? reply : { entry: answer.entry };
    }
    if (!allowFiles) {
      return problem(reply, 403, 'files-not-here', 'Files are not changed here', 'This server changes the variables only. The kit\'s files change on the development server (npm start).');
    }
    const target = await editablePath(kitDir, entry.path);
    if (!target.absolute) return problem(reply, 400, 'not-editable', 'This file cannot be changed', target.reason);
    const made = await saveFile(target, entry.before, entry.id);
    return { entry: made && publicEntry(made) };
  });

  // The scenes the admin keeps (the gallery of the Scenes page): the admin's alone, to read and to change.
  // A scene is checked here for its shape and size; the catalog checks every value when it reads one.
  const sceneBody = {
    bodyLimit: SCENE_STORE_LIMITS.bytes * 2,
    schema: { body: { type: 'object', required: ['scene'], properties: { scene: { type: 'object' } } } },
  };
  const noScene = (reply) => problem(reply, 404, 'not-found', 'No such scene', 'It is not in the gallery any more.');

  app.get('/api/scenes', async (request, reply) => {
    if (!adminOnly(request, reply)) return reply;
    return { scenes: await scenes.list() };
  });

  app.post('/api/scenes', sceneBody, async (request, reply) => {
    if (!adminOnly(request, reply)) return reply;
    const reason = invalidScene(request.body.scene);
    if (reason) return problem(reply, 400, 'invalid-scene', 'Invalid scene', reason);
    const kept = await scenes.add(request.body.scene);
    if (!kept) return problem(reply, 409, 'gallery-full', 'The gallery is full', `It keeps ${SCENE_STORE_LIMITS.scenes} scenes at most: take one out first.`);
    return reply.code(201).send(kept);
  });

  app.put('/api/scenes/:id', sceneBody, async (request, reply) => {
    if (!adminOnly(request, reply)) return reply;
    const reason = invalidScene(request.body.scene);
    if (reason) return problem(reply, 400, 'invalid-scene', 'Invalid scene', reason);
    return (await scenes.update(request.params.id, request.body.scene)) ?? noScene(reply);
  });

  // Taken out of the gallery, not erased: it can be put back.
  app.delete('/api/scenes/:id', async (request, reply) => {
    if (!adminOnly(request, reply)) return reply;
    if (!(await scenes.remove(request.params.id))) return noScene(reply);
    return reply.code(204).send();
  });

  app.post('/api/scenes/:id/restore', async (request, reply) => {
    if (!adminOnly(request, reply)) return reply;
    return (await scenes.restore(request.params.id)) ?? noScene(reply);
  });

  // The pages' backgrounds: everyone reads them (every page draws its own), the admin chooses. A scene of the
  // gallery comes with them, whole, so a visitor draws it without reading the gallery; one taken out says so
  // (the page has the catalog's own again). The public gets nothing of a hidden page.
  async function shownBackgrounds(request) {
    const admin = signedIn(request);
    const kept = new Map((await scenes.list()).map((entry) => [entry.id, entry]));
    const shown = (choice) => {
      if (!choice || choice === 'same' || !('saved' in choice)) return choice;
      const entry = kept.get(choice.saved);
      return entry ? { saved: entry.id, name: entry.name, scene: entry.scene } : { saved: choice.saved, missing: true };
    };
    const out = {};
    for (const [key, background] of Object.entries(backgrounds.all())) {
      if (!admin && pages.isHidden(key)) continue;
      out[key] = { computer: shown(background.computer), phone: shown(background.phone) };
    }
    return { pages: out };
  }

  app.get('/api/backgrounds', async (request) => shownBackgrounds(request));

  app.put(
    '/api/backgrounds',
    { schema: { body: { type: 'object', required: ['page', 'computer', 'phone'], properties: { page: { type: 'string' } } } } },
    async (request, reply) => {
      if (!adminOnly(request, reply)) return reply;
      const { page, computer, phone } = request.body;
      const reason = backgrounds.invalid(page, { computer, phone }, pages.exists);
      if (reason) return problem(reply, 400, 'invalid-background', 'Invalid background', reason);
      await backgrounds.set(page, { computer, phone });
      return shownBackgrounds(request);
    },
  );

  if (publicDir) {
    const { default: fastifyStatic } = await import('@fastify/static');
    await app.register(fastifyStatic, { root: publicDir, wildcard: false });
    // The catalog routes in the browser: an address that is not a file is its index.html.
    app.setNotFoundHandler((request, reply) => {
      if (request.method !== 'GET' || request.url.startsWith('/api/')) {
        return problem(reply, 404, 'not-found', 'Not found', `Nothing at ${request.method} ${request.url}.`);
      }
      return reply.sendFile('index.html');
    });
  } else {
    app.setNotFoundHandler((request, reply) => problem(reply, 404, 'not-found', 'Not found', `Nothing at ${request.method} ${request.url}.`));
  }

  return app;
}

// `node server/server.mjs`: PORT (4301), HOST (127.0.0.1), PUBLIC_DIR (the built catalog, none in
// development), KIT_ADMIN_USER and KIT_ADMIN_PASSWORD (the admin; without them nothing is saved),
// KIT_ALLOW_FILES ("true" in development: the admin changes the kit's files too), TOKENS_JSON and
// TOKENS_CSS (the files), TOKENS_VALUES (saved values kept apart: Docker), HISTORY_FILE (the saves),
// PAGES_FILE (the pages hidden from the public), SITE_PAGES_FILE (the catalog's pages, from its build:
// needed to serve the catalog), SCENES_FILE (the scenes the admin keeps), BACKGROUNDS_FILE (the pages'
// backgrounds), TRUST_PROXY ("true" behind a reverse proxy).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // Serving the catalog without knowing its pages would serve every file of the kit to anyone.
  if (process.env.PUBLIC_DIR && !process.env.SITE_PAGES_FILE) {
    console.error('SITE_PAGES_FILE is not set: the catalog is not served without the list of its pages (npm run build writes dist/site-pages.json).');
    process.exit(1);
  }
  const app = await buildServer({
    publicDir: process.env.PUBLIC_DIR || null,
    kitDir: process.env.KIT_DIR || KIT_DIR,
    tokensJson: process.env.TOKENS_JSON || TOKENS_JSON,
    tokensCss: process.env.TOKENS_CSS || TOKENS_CSS,
    valuesPath: process.env.TOKENS_VALUES || null,
    allowFiles: process.env.KIT_ALLOW_FILES === 'true',
    adminUser: process.env.KIT_ADMIN_USER || '',
    adminPassword: process.env.KIT_ADMIN_PASSWORD || '',
    historyPath: process.env.HISTORY_FILE || null,
    pagesPath: process.env.PAGES_FILE || null,
    sitePagesPath: process.env.SITE_PAGES_FILE || null,
    scenesPath: process.env.SCENES_FILE || null,
    backgroundsPath: process.env.BACKGROUNDS_FILE || null,
    trustProxy: process.env.TRUST_PROXY === 'true',
    logger: true,
  });
  await app.listen({ port: Number(process.env.PORT || 4301), host: process.env.HOST || '127.0.0.1' });
}

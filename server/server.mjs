// The kit's server (Fastify, like the apps' APIs). Two jobs:
// - development (`npm start`, tools/dev.mjs): the catalog's Variables page saves through it into
//   projects/kit/src/styles/tokens.json and tokens.css (KIT_ALLOW_SAVE=true, on 127.0.0.1 only);
// - production (Docker): it serves the built catalog, every unknown address answered by index.html
//   (the catalog routes in the browser), and the variables read-only.
import Fastify from 'fastify';
import { stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TOKENS_CSS, TOKENS_JSON, applyValues, readTokens, writeTokens } from './tokens.mjs';

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
 * @param {{ publicDir?: string | null, tokensJson?: string, tokensCss?: string, kitDir?: string, allowSave?: boolean, logger?: boolean }} options
 */
export async function buildServer({
  publicDir = null,
  tokensJson = TOKENS_JSON,
  tokensCss = TOKENS_CSS,
  kitDir = KIT_DIR,
  allowSave = false,
  logger = false,
} = {}) {
  const app = Fastify({ logger });

  // A few headers every page of the kit's apps sends.
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'same-origin');
  });

  // Whether it can write into the kit: the catalog's editors save, or only show.
  app.get('/api/health', async () => ({ ok: true, canSave: allowSave }));

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
      if (!allowSave) {
        return problem(reply, 403, 'save-disabled', 'Saving is off', 'This server shows the kit. Changing its files needs the development server (npm start).');
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
      await writeFile(target.absolute, content);
      return { path: target.relative };
    },
  );

  // The variables, and whether this server can save them (the Variables page says so).
  app.get('/api/tokens', async () => ({ ...(await readTokens(tokensJson)), canSave: allowSave }));

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
      if (!allowSave) {
        return problem(reply, 403, 'save-disabled', 'Saving is off', 'This server shows the kit. Saving the variables needs the development server (npm start).');
      }
      const result = applyValues(await readTokens(tokensJson), request.body.values);
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
      await writeTokens(result.document, tokensJson, tokensCss);
      return { ...result.document, canSave: true };
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
// development), KIT_ALLOW_SAVE ("true" in development), TOKENS_JSON and TOKENS_CSS (the files).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const app = await buildServer({
    publicDir: process.env.PUBLIC_DIR || null,
    kitDir: process.env.KIT_DIR || KIT_DIR,
    tokensJson: process.env.TOKENS_JSON || TOKENS_JSON,
    tokensCss: process.env.TOKENS_CSS || TOKENS_CSS,
    allowSave: process.env.KIT_ALLOW_SAVE === 'true',
    logger: true,
  });
  await app.listen({ port: Number(process.env.PORT || 4301), host: process.env.HOST || '127.0.0.1' });
}

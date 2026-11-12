// The kit's server (Fastify, like the apps' APIs). Two jobs:
// - development (`npm start`, tools/dev.mjs): the catalog's Variables page saves through it into
//   projects/kit/src/styles/tokens.json and tokens.css (KIT_ALLOW_SAVE=true, on 127.0.0.1 only);
// - production (Docker): it serves the built catalog, every unknown address answered by index.html
//   (the catalog routes in the browser), and the variables read-only.
import Fastify from 'fastify';
import { fileURLToPath } from 'node:url';

import { TOKENS_CSS, TOKENS_JSON, applyValues, readTokens, writeTokens } from './tokens.mjs';

/** A Problem Details answer (RFC 9457), the shape every API of the kit's apps answers with. */
function problem(reply, status, code, title, detail, errors = []) {
  return reply
    .code(status)
    .type('application/problem+json')
    .send({ type: `urn:ui-kit:problem:${code}`, title, status, detail, errors });
}

/**
 * @param {{ publicDir?: string | null, tokensJson?: string, tokensCss?: string, allowSave?: boolean, logger?: boolean }} options
 */
export async function buildServer({ publicDir = null, tokensJson = TOKENS_JSON, tokensCss = TOKENS_CSS, allowSave = false, logger = false } = {}) {
  const app = Fastify({ logger });

  // A few headers every page of the kit's apps sends.
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'same-origin');
  });

  app.get('/api/health', async () => ({ ok: true }));

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
    tokensJson: process.env.TOKENS_JSON || TOKENS_JSON,
    tokensCss: process.env.TOKENS_CSS || TOKENS_CSS,
    allowSave: process.env.KIT_ALLOW_SAVE === 'true',
    logger: true,
  });
  await app.listen({ port: Number(process.env.PORT || 4301), host: process.env.HOST || '127.0.0.1' });
}

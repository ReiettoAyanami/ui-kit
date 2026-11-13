# The kit's catalog, deployable as one image: built with the workspace, served by the kit's server
# (server/server.mjs, Fastify) on port 8080. Everyone reads it; the admin (KIT_ADMIN_USER and
# KIT_ADMIN_PASSWORD in the environment) signs in on its Admin page and changes the variables on the
# fly: they are kept in /app/data (a volume) with the history of the saves, apart from the image, and
# every visitor gets them. The kit's files change on the development server (`npm start`, or
# compose.dev.yaml), which writes into the repo: a new build shows them.

# --- build: the library, then the catalog ------------------------------------------------------
FROM node:24-bookworm-slim AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# --- runtime: the server and what it serves ----------------------------------------------------
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    PUBLIC_DIR=/app/public \
    TOKENS_JSON=/app/tokens/tokens.json \
    TOKENS_VALUES=/app/data/variables.json \
    HISTORY_FILE=/app/data/history.jsonl
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server/server.mjs server/tokens.mjs server/auth.mjs server/history.mjs ./
COPY --from=build /workspace/dist/catalog/browser /app/public
COPY --from=build /workspace/projects/kit/src/styles/tokens.json /app/tokens/tokens.json
RUN mkdir -p /app/data && chown node:node /app/data
VOLUME /app/data
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD node -e "fetch('http://127.0.0.1:8080/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.mjs"]

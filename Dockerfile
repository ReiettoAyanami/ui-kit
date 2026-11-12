# The kit's catalog, deployable as one image: built with the workspace, served by the kit's server
# (server/server.mjs, Fastify) on port 8080. In the image the variables are read only: saving them
# is for the development server (`npm start`, or compose.dev.yaml), which writes into the repo.

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
    TOKENS_JSON=/app/tokens/tokens.json
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server/server.mjs server/tokens.mjs ./
COPY --from=build /workspace/dist/catalog/browser /app/public
COPY --from=build /workspace/projects/kit/src/styles/tokens.json /app/tokens/tokens.json
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD node -e "fetch('http://127.0.0.1:8080/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.mjs"]

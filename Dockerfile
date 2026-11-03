# syntax=docker/dockerfile:1
FROM node:24.22.1-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --strict-ssl=true --no-audit --no-fund
COPY . .
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm run package && npm prune --omit=dev --ignore-scripts --no-audit --no-fund
FROM node:24.22.1-bookworm-slim
ENV NODE_ENV=production PORT=3210
WORKDIR /app
COPY --from=build --chown=node:node /app /app
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3210
CMD ["node", "server.mjs"]

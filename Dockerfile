# Imagem única que builda o monorepo e serve a API (com o dashboard embutido).
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

# Manifests primeiro para aproveitar cache de instalação.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/catalog/package.json packages/catalog/
COPY packages/core/package.json packages/core/
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# Código e build do front (apps/web/dist é servido pela API).
COPY . .
RUN pnpm --filter @monitor-sefaz/web build

# ---- Runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production

# Copia o monorepo (com apps/web/dist). A API roda via tsx, resolvendo os
# pacotes de workspace direto do TypeScript — sem bundle, o que preserva o
# monkey-patch do axios-cookiejar-support usado no scraping da SEFAZ.
COPY --from=build /app ./

EXPOSE 3333
WORKDIR /app/apps/api
CMD ["pnpm", "start"]

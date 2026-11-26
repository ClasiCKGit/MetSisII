# syntax=docker/dockerfile:1

# Imagen de producción de la API. Se construye desde la RAÍZ del repo, porque el
# monorepo tiene un único package-lock.json:
#   docker build -f apps/api/Dockerfile -t fitmanager-api .
# Detalle en docs/backend/deploy.md

ARG NODE_VERSION=22

# Debian slim y no Alpine: bcrypt y el schema engine de Prisma traen binarios para glibc,
# y el engine necesita OpenSSL.
FROM node:${NODE_VERSION}-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ─── Compilación ────────────────────────────────────────────────
FROM base AS build

# Primero solo los manifiestos: si no cambian las dependencias, Docker reutiliza esta capa.
# El de apps/web hace falta porque el lockfile lo nombra como workspace.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# "prepare" corre husky (hooks de git): no hay .git ni sirve en la imagen
RUN npm pkg delete scripts.prepare \
  && npm ci --workspace=apps/api --include-workspace-root=false

COPY apps/api/ apps/api/
# prisma.config.ts exige DATABASE_URL aunque generate no se conecta: alcanza un valor falso
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npm run prisma:generate -w apps/api \
  && npm run build -w apps/api

# ─── Producción ─────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production
ENV PATH=/app/node_modules/.bin:$PATH

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm pkg delete scripts.prepare \
  && npm ci --omit=dev --workspace=apps/api --include-workspace-root=false \
  && npm cache clean --force

# El código compilado (incluye el cliente de Prisma generado) y lo que usa migrate deploy
COPY --from=build /app/apps/api/dist apps/api/dist
COPY apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma/schema.prisma apps/api/prisma/
COPY apps/api/prisma/migrations apps/api/prisma/migrations

WORKDIR /app/apps/api
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Aplica las migraciones pendientes y arranca. "exec" deja a node como PID 1, para que
# reciba el SIGTERM del orquestador y cierre ordenadamente.
CMD ["sh", "-c", "prisma migrate deploy && exec node dist/server.js"]

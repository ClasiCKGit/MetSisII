# Deploy de la API: imagen Docker

La API se despliega como una imagen Docker (`apps/api/Dockerfile`, FIT-78). La misma imagen sirve para Render, Railway o un VPS, así que no depende de qué hosting se elija (FIT-79).

---

## 1. Construir y probar en local

La imagen se construye **desde la raíz del repo**, porque el monorepo tiene un único `package-lock.json`:

```bash
docker build -f apps/api/Dockerfile -t fitmanager-api .
```

Para probarla contra el Postgres de desarrollo hay un servicio `api` en `docker-compose.yml`, con perfil propio (`npm run db:up` sigue levantando solo la base):

```bash
npm run db:up
npm run docker:api        # construye la imagen y levanta el contenedor en http://localhost:3001
docker logs -f fitmanager-api
npm run docker:api:down   # lo detiene
```

- Toma las variables de `apps/api/.env` y pisa tres: `NODE_ENV=production`, `PORT=3000` y `DATABASE_URL`, que apunta a `postgres:5432` (el nombre del servicio dentro de la red de Compose) con las credenciales del `.env` de la raíz. Usa la misma base de desarrollo.
- Escucha en el puerto `3001` del host (`API_DOCKER_PORT` para cambiarlo), para no chocar con `npm run dev`.
- Con `NODE_ENV=production` el límite de intentos es el real (20 cada 15 minutos) y los logs salen en JSON, sin `pino-pretty`.

---

## 2. Cómo está armada

Es un build en dos etapas sobre `node:22-slim`:

| Etapa | Qué hace |
|---|---|
| `build` | Instala todas las dependencias de `apps/api`, genera el cliente de Prisma y compila con `tsc` a `dist/`. |
| `runtime` | Instala solo las dependencias de producción y copia `dist/`, `schema.prisma`, las migraciones y `prisma.config.ts`. No lleva el código fuente ni los tests. |

Decisiones:

- **Debian slim y no Alpine.** bcrypt y el schema engine de Prisma traen binarios compilados para glibc, y el engine necesita OpenSSL (se instala en la imagen).
- **Se borra el script `prepare` antes del `npm ci`.** Corre husky, que instala hooks de git: en la imagen no hay `.git`, y con `--omit=dev` husky ni siquiera está instalado.
- **`prisma` es una dependencia de producción**, no de desarrollo: el contenedor lo usa para `prisma migrate deploy`.
- **`prisma generate` recibe un `DATABASE_URL` falso.** `prisma.config.ts` la exige aunque `generate` no se conecta a la base.
- **Corre como el usuario `node`**, no como root.
- **`.dockerignore`** deja afuera `node_modules`, `dist`, los `.env`, el cliente generado, la web y la documentación. El `package.json` de `apps/web` sí entra, porque el lockfile lo nombra como workspace.

### Al arrancar

```sh
prisma migrate deploy && exec node dist/server.js
```

1. **Aplica las migraciones pendientes** (`migrate deploy`, nunca `migrate dev`: no genera migraciones ni resetea la base). Si falla, el contenedor no arranca.
2. Arranca la API. Con `exec`, `node` queda como PID 1 y recibe directamente el `SIGTERM` del orquestador.

**Cierre ordenado.** Ante `SIGTERM` o `SIGINT`, `server.ts` deja de aceptar conexiones, espera a que terminen las requests en curso (hasta 10 segundos), cierra la conexión a la base y sale con código `0`. Así un redeploy no corta requests a la mitad.

**Healthcheck.** La imagen consulta `GET /health` cada 30 segundos. `docker ps` muestra `healthy` o `unhealthy`; Render y Railway tienen su propio health check, que hay que configurar apuntando a `/health`.

---

## 3. Variables de entorno en producción

La imagen no lleva ningún `.env`: todas las variables se configuran en el hosting.

| Variable | Valor en producción |
|---|---|
| `DATABASE_URL` | La del Postgres del hosting. |
| `JWT_SECRET` | Un secreto largo y aleatorio, distinto del de desarrollo (por ejemplo `openssl rand -base64 48`). |
| `RESEND_API_KEY` | La API key de Resend. |
| `MAIL_FROM` | Un remitente del dominio verificado en Resend. Con `onboarding@resend.dev` los mails solo llegan a la cuenta de Resend (ver `docs/backend/notificaciones.md`). |
| `FRONTEND_URL` | La URL pública del front: arma el link de recuperación y es el origen permitido por CORS. |
| `CORS_ORIGINS` | Solo si el front se sirve desde más de un origen (por ejemplo, con y sin `www`). |
| `TRUST_PROXY` | `1` en Render o Railway (hay un proxy delante). Ver `docs/backend/auth.md`, `authLimiter`. |
| `REGISTRO_GIMNASIOS_HABILITADO` | `false`, salvo que se quiera dejar abierto el alta de gimnasios. |
| `NODE_ENV` | Ya viene en `production` en la imagen. |
| `PORT` | Lo define el hosting si hace falta; por defecto `3000`. |
| `ZONA_HORARIA` | Por defecto `America/Argentina/Buenos_Aires`. |

---

## 4. CI

El job `docker-api` de `.github/workflows/ci.yml` construye la imagen en cada push a `dev` y `main` y en los PR a `main`. Solo verifica que el build funcione: **no publica la imagen** en ningún registro. Publicarla (o que el hosting la construya desde el repo) se define con el hosting.

---

## 5. Limitaciones y alternativas

| Tema | Detalle |
|---|---|
| Tamaño (~600 MB) | Casi todo es el CLI de Prisma (`prisma` y `@prisma/*`, unos 215 MB), que trae dependencias de Prisma Studio. Está en la imagen solo para `migrate deploy`. Si el tamaño molesta, se pueden correr las migraciones desde el CI o como un paso de "release" del hosting, y sacar `prisma` de la imagen. |
| Migraciones al arrancar | Con más de una instancia, todas intentarían migrar a la vez. Prisma toma un lock en la base, así que no se rompe, pero lo prolijo es migrar en un paso aparte. Con una instancia no hace falta. |
| Varias instancias | Cada instancia programaría el job de recordatorios (ver `docs/backend/notificaciones.md`). |
| Seed | La imagen no incluye `prisma/seed.ts`: en producción no se cargan datos de prueba. |

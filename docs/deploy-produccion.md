# Deploy en producción: Railway y Netlify

Producción usa dos servicios (FIT-79):

| Parte | Dónde | Cómo se construye |
|---|---|---|
| API + Postgres | **Railway** | Con la imagen Docker de `apps/api/Dockerfile` (ver `docs/backend/deploy.md`), configurada en `railway.json` |
| Web | **Netlify** | `npm run build -w apps/web`, configurado en `netlify.toml` |

Los dos despliegan solos desde la rama **`main`**: a `main` solo se llega por PR desde `dev`, con el CI en verde. Así, lo que está en producción siempre pasó lint, tests, e2e y el build de la imagen.

**Por qué Railway y Netlify.** Railway corre la imagen Docker tal cual (con las migraciones al arrancar y el job de recordatorios, que necesita un proceso siempre prendido) y tiene Postgres en el mismo proyecto, en una red privada. El front es estático: Netlify lo sirve desde un CDN, con HTTPS y sin costo.

---

## 1. API y base en Railway

### Crear el proyecto (una sola vez)

1. En Railway: **New Project → Deploy from GitHub repo** y elegir el repositorio. Si pide permisos, darle acceso a la GitHub App de Railway solo para este repo.
2. En el servicio creado, **Settings**:
   - **Source → Branch:** `main`.
   - **Root Directory:** vacío (la raíz). La imagen se construye desde la raíz porque el monorepo tiene un único `package-lock.json`.
   - **Wait for CI:** activado. Railway espera a que pase el CI de GitHub antes de desplegar.
   - Railway lee `railway.json` de la raíz: builder Dockerfile (`apps/api/Dockerfile`), health check en `/health` y reinicio automático si el proceso se cae. Los cambios que solo tocan `apps/web` o `docs/` no redespliegan la API (`watchPatterns`).
3. **+ New → Database → PostgreSQL**, en el mismo proyecto.
4. En el servicio de la API, **Variables** (ver la tabla de abajo). `DATABASE_URL` se carga como referencia, `${{Postgres.DATABASE_URL}}`, así usa la red privada y se actualiza sola si cambia la contraseña.
5. **Settings → Networking → Generate Domain.** Railway da una URL como `https://fitmanager-api-production.up.railway.app`. Es el `VITE_API_URL` de Netlify.

### Variables de la API

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | Un secreto largo y aleatorio, distinto del de desarrollo: `openssl rand -base64 48` |
| `RESEND_API_KEY` | La API key de Resend |
| `MAIL_FROM` | `FitManager <onboarding@resend.dev>` mientras no haya dominio verificado en Resend (con ese remitente los mails solo llegan a la cuenta de Resend; ver `docs/backend/notificaciones.md`) |
| `FRONTEND_URL` | La URL de Netlify, **sin barra final**: `https://<sitio>.netlify.app`. Arma el link de recuperación de contraseña y es el origen que permite CORS |
| `TRUST_PROXY` | `1` (el proxy de Railway). Sin esto, el límite de intentos de login cuenta a todos como si fueran la misma IP |
| `REGISTRO_GIMNASIOS_HABILITADO` | `true` solo hasta dar de alta los gimnasios; después `false` (ver sección 3) |

`NODE_ENV=production` ya viene en la imagen y `PORT` lo pone Railway (la API lo lee).

### Qué pasa en cada deploy

1. Railway construye la imagen con el `Dockerfile`.
2. Al arrancar, el contenedor corre `prisma migrate deploy` y después la API. Si una migración falla, el contenedor no arranca y Railway mantiene la versión anterior.
3. Railway espera a que `GET /health` responda 200 (hasta 120 segundos, contando las migraciones) antes de pasarle tráfico. Después apaga la versión anterior con `SIGTERM`, y la API cierra ordenadamente.

Las migraciones usan la collation `es-x-icu`. El Postgres de Railway trae ICU; si no la tuviera, la primera migración fallaría y se vería en los logs del deploy.

Una sola réplica (`numReplicas: 1`): con más, cada una programaría el job de recordatorios y todas migrarían al arrancar (ver `docs/backend/deploy.md`, sección 5).

### Verificar

```bash
curl https://<api>.up.railway.app/health
# {"status":"ok","timestamp":"..."}
```

Los logs están en el servicio, pestaña **Deployments → View logs** (en JSON, por pino).

---

## 2. Web en Netlify

### Crear el sitio (una sola vez)

1. En Netlify: **Add new project → Import an existing project → GitHub** y elegir el repositorio.
2. Netlify lee `netlify.toml` de la raíz, así que los campos de build se completan solos:
   - **Base directory:** la raíz. **Build command:** `npm run build -w apps/web`. **Publish directory:** `apps/web/dist`.
   - Node 22 (`NODE_VERSION`).
3. **Branch to deploy:** `main`.
4. **Environment variables:** `VITE_API_URL` = la URL de Railway, **sin barra final** (`https://<api>.up.railway.app`). Vite la escribe dentro del build: si cambia, hay que volver a desplegar (**Deploys → Trigger deploy**).
5. **Site configuration → Change site name** para tener una URL legible (`https://<sitio>.netlify.app`). Esa URL va en `FRONTEND_URL` de Railway.
6. **Deploy Previews: desactivarlas** (*Site configuration → Build & deploy → Branches and deploy contexts*). Cada vista previa tiene una URL distinta que la API no acepta por CORS, así que no podría iniciar sesión.

### Qué hace `netlify.toml`

| Parte | Para qué |
|---|---|
| `ignore` | Si el commit no toca `apps/web`, `package.json`, el lockfile ni `netlify.toml`, Netlify no reconstruye. Un cambio que solo toca la API no redespliega la web |
| Redirect `/* → /index.html` (200) | Es una SPA: sin esto, recargar en `/socios` daría 404, porque ese archivo no existe |
| Headers de seguridad | No se puede embeber en un iframe (`X-Frame-Options`), no adivina tipos de archivo, no manda la URL completa a otros sitios y no pide cámara, micrófono ni ubicación |
| Caché de `/assets/*` | Los archivos de Vite llevan un hash en el nombre: se cachean un año. `index.html` no se cachea, así un deploy nuevo se ve enseguida |

### El orden la primera vez

La API necesita la URL de la web (`FRONTEND_URL`) y la web la de la API (`VITE_API_URL`):

1. Crear la API en Railway (sección 1) con `FRONTEND_URL` provisoria y generar su dominio.
2. Crear el sitio en Netlify con `VITE_API_URL` y ponerle nombre.
3. Volver a Railway y poner en `FRONTEND_URL` la URL de Netlify. Railway redespliega solo al cambiar una variable.

Si la web carga pero el login falla con un error de red, casi siempre es CORS: `FRONTEND_URL` no coincide exactamente con la URL del sitio (`https`, sin barra final). En la consola del navegador se ve como "blocked by CORS policy".

---

## 3. Primer gimnasio y cierre del registro

En producción no se corre el seed (la imagen no lo incluye). Los gimnasios se crean desde la web:

1. Con `REGISTRO_GIMNASIOS_HABILITADO=true`, entrar a `https://<sitio>.netlify.app/registro` y registrar cada gimnasio con su administrador.
2. Cambiar `REGISTRO_GIMNASIOS_HABILITADO` a `false` en Railway. La API responde 403 al registro y la web deja de mostrar el enlace.
3. El resto del personal lo da de alta cada administrador desde **Usuarios**.

---

## 4. Respaldos de la base (FIT-84)

El workflow `.github/workflows/respaldo-db.yml` respalda la base de Railway **todos los días a las 03:00** (hora argentina) y también se puede correr a mano (*Actions → Respaldo de la base → Run workflow*).

1. `pg_dump` en formato custom (`--no-owner --no-privileges`, para poder restaurarlo en otra base con otro usuario). Corre en un contenedor `postgres:18-alpine`: tiene que ser de la misma versión mayor que el servidor o más nueva.
2. Comprueba el volcado con `pg_restore --list` y que tenga los datos de `gimnasios`. Si no, el job falla.
3. Lo **cifra con AES-256** (`gpg --symmetric`). El repo es público y los artefactos de un repo público los puede descargar cualquier usuario de GitHub: sin cifrar, quedarían expuestos los datos de socios y los hashes de contraseñas.
4. Lo sube como artefacto `fitmanager-<fecha>.dump.gpg`, que GitHub guarda **30 días**.

Si falla (por ejemplo, porque cambió la contraseña de la base), GitHub avisa por mail a quien modificó por última vez la programación del workflow.

### Configurarlo (una sola vez)

En GitHub, **Settings → Secrets and variables → Actions → New repository secret**:

| Secreto | Valor |
|---|---|
| `BACKUP_DATABASE_URL` | La variable `DATABASE_PUBLIC_URL` del Postgres de Railway. Es la URL pública (por el proxy TCP de Railway): la `DATABASE_URL` normal usa la red privada, que desde GitHub no se alcanza |
| `BACKUP_PASSPHRASE` | Una clave larga (`openssl rand -base64 32`). **Guardarla fuera de GitHub**, en un gestor de contraseñas: sin ella los respaldos no se pueden abrir, y GitHub no deja volver a leer un secreto |

GitHub solo programa los workflows que están en la rama por defecto: el respaldo diario empieza cuando este archivo llega a `main`.

### Restaurar

```bash
# 1. Bajar el respaldo (o desde la página del run, en "Artifacts")
gh run download <id-del-run> --repo ClasiCKGit/MetSisII

# 2. Descifrarlo
gpg --batch --pinentry-mode loopback --passphrase "<BACKUP_PASSPHRASE>" \
  --decrypt --output fitmanager.dump fitmanager-<fecha>.dump.gpg

# 3. Restaurarlo. --clean --if-exists borra y recrea cada objeto: la base queda como en el respaldo
docker run --rm -v "$PWD:/respaldo" postgres:18-alpine \
  pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="<URL de la base destino>" /respaldo/fitmanager.dump
```

- **Probar primero en una base vacía**, no directamente sobre producción. Para restaurar producción, conviene apagar la API antes (en Railway, menú del deploy activo → **Remove**) para que nadie escriba mientras tanto.
- Si el servidor es de una versión anterior a la de `pg_restore`, puede aparecer `unrecognized configuration parameter "transaction_timeout"`. Es inofensivo: es un parámetro de Postgres 17+ y los datos se restauran igual. Lo probamos restaurando un respaldo de la base de desarrollo (Postgres 16).

**Complemento.** Railway también ofrece respaldos de los volúmenes en sus planes pagos (pestaña **Backups** del Postgres). Si el plan los incluye, conviene activarlos además de estos: se restauran con un clic, pero quedan dentro de Railway.

---

## 5. Checklist

- [ ] `GET /health` de Railway responde 200.
- [ ] La web carga y, recargando en `/socios`, sigue funcionando (sin 404).
- [ ] Login, alta de socio, inscripción y cobro funcionan contra la API de Railway.
- [ ] "Olvidé mi contraseña" manda el mail y el link abre la web de Netlify.
- [ ] `REGISTRO_GIMNASIOS_HABILITADO=false` después de crear los gimnasios.
- [ ] El respaldo diario de la base corrió al menos una vez.

---

## 6. Problemas que aparecieron en el primer deploy

| Síntoma | Causa | Solución |
|---|---|---|
| Railway muestra el recuadro de **Railpack** y falla con `No start command detected` | La rama que despliega no tiene `railway.json` (pasó porque `main` todavía no tenía los cambios de `dev`), o el servicio no lo lee | Que `railway.json` y `apps/api/Dockerfile` estén en `main`. Si sigue, cargar la variable `RAILWAY_DOCKERFILE_PATH=apps/api/Dockerfile` o poner `/railway.json` en *Settings → Config-as-code*. No agregar un start command ni cambiar el Root Directory: se saltearía el Dockerfile |
| La API crashea con `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL` | La variable no llega al contenedor. En nuestro caso la referencia `${{Postgres.DATABASE_URL}}` no se resolvía | Pegar en la API el valor real de `DATABASE_URL` del servicio de Postgres. Revisar que esté en el servicio de la API y aplicar los cambios con **Deploy** |
| La web queda en negro | El build se hizo sin `VITE_API_URL`, o con un valor que no es una URL completa (sin `https://`). `src/config/env.ts` la valida y corta la carga | Corregir la variable en Netlify y **Clear cache and deploy site**. Vite la escribe dentro del build: cambiarla no alcanza sin un deploy nuevo |
| El login falla con un error de red | CORS: `FRONTEND_URL` de Railway no es exactamente la URL de Netlify | `https://<sitio>.netlify.app`, sin barra final |
| "Application failed to respond" al abrir la URL de Railway | El puerto del dominio no es el que escucha la API | Usar el que figura en el log `API corriendo en http://localhost:<puerto>` (Railway pone `PORT`, normalmente 8080) |

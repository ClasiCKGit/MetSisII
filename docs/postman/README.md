# Colección de Postman

`FitManager.postman_collection.json` tiene **todos los endpoints de la API** (54 requests, organizados por módulo), con cuerpos de ejemplo válidos, los filtros de cada listado y una descripción con los roles y errores de cada uno.

## Importarla

Postman → **Import** → elegir `docs/postman/FitManager.postman_collection.json`. No hace falta un environment: las variables son de la colección.

| Variable | Para qué |
|---|---|
| `baseUrl` | `http://localhost:3000` (`npm run dev:api`). Con la imagen Docker (`npm run docker:api`), `http://localhost:3001` |
| `token` | Se completa sola: cualquier respuesta que traiga `token` (registro, login, cambio de contraseña) lo guarda |
| `gimnasioSlug`, `adminEmail`, `adminPassword` | Las genera *Registrar gimnasio* |
| `socioId`, `actividadId`, `membresiaId`, `pagoId`, ... | Cada request de creación guarda el id que devuelve, y los siguientes lo usan |
| `resetToken` | Pegar acá el token del mail de *Olvidé mi contraseña* para probar *Restablecer contraseña* |

## Dos formas de usarla

- **Correrla entera** (*Run collection*, en orden): *Registrar gimnasio* crea un gimnasio nuevo con slug aleatorio y todo lo demás se hace sobre él. Se puede repetir sin limpiar la base. Cada request verifica su status esperado.
- **Con los datos del seed**: ejecutar *Auth → Login con el seed (FitZone)* (`admin@fitzone.com` / `admin123`) y después cualquier request. Los ids de las variables hay que completarlos a mano (o crear antes el recurso desde la colección).

El orden importa en algunos casos: *Desvincular profesor* está al final de *Horarios* porque el horario de ejemplo usa ese vínculo, y la baja de socio y la eliminación del plan usan un socio y un plan propios, para no romper la inscripción que viene después.

## Tener en cuenta

- *Olvidé mi contraseña* manda un mail de verdad si la API tiene una `RESEND_API_KEY` real. Los emails que genera la colección son de `@postman.test`, que no existe.
- Correrla contra la API de desarrollo deja en la base gimnasios `postman-...`. Si molestan, `npm run db:seed` resetea la base de desarrollo.
- Si se agrega o cambia un endpoint, actualizar la colección (exportarla desde Postman sobre este mismo archivo).

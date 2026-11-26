# Pagos

`/api/pagos` requiere sesión. Cada consulta y modificación se limita automáticamente al gimnasio del usuario autenticado.

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/pagos` | Lista pagos; permite filtrar por `socioId`, `membresiaId`, `estado`, `metodoPago`, `desde` y `hasta` |
| `GET` | `/api/pagos/exportar` | Descarga el reporte de pagos en CSV, con los mismos filtros que el listado (solo ADMIN) |
| `GET` | `/api/pagos/:id` | Obtiene un pago con el socio y la membresía asociada |
| `POST` | `/api/pagos` | Registra un pago (ADMIN o RECEPCIONISTA) |
| `PATCH` | `/api/pagos/:id/estado` | Cambia un pago pendiente a `PAGADO` o `RECHAZADO` (ADMIN o RECEPCIONISTA) |

El alta acepta `socioId`, `monto`, `metodoPago` y opcionalmente `membresiaId`, `estado`, `concepto` y `fecha` (ISO 8601). Un `membresiaId` debe pertenecer al socio indicado y no estar cancelada (`409` "La membresía está cancelada"). Al cancelar una membresía, sus pagos pendientes pasan a `RECHAZADO` (ver `docs/backend/membresias.md`). El monto acepta un número o una cadena decimal positiva de hasta dos decimales y el máximo de la columna `Decimal(10, 2)`.

Ejemplo:

```http
POST /api/pagos
Authorization: Bearer <token>
Content-Type: application/json

{
  "socioId": "<uuid-socio>",
  "monto": "1250.50",
  "metodoPago": "EFECTIVO",
  "concepto": "Cuota mensual"
}
```

Los filtros de fecha `desde` y `hasta` aceptan fechas ISO 8601 con zona horaria y delimitan `fecha` de forma inclusiva. Por ejemplo: `/api/pagos?estado=PAGADO&socioId=<uuid-socio>&desde=2026-11-01T00:00:00.000Z&hasta=2026-11-30T23:59:59.999Z`.

## Reporte CSV

`GET /api/pagos/exportar` devuelve los mismos pagos que `GET /api/pagos` con esos filtros (mismo orden, misma validación: 400 si un filtro es inválido o el rango está invertido), como archivo `text/csv; charset=utf-8` con `Content-Disposition: attachment; filename="pagos.csv"`. Es solo para ADMIN porque es un reporte de ingresos; recepción recibe 403.

El formato está pensado para abrirse con doble clic en Excel con configuración regional en español:

- Columnas: `Fecha;Socio;Concepto;Método de pago;Estado;Monto`.
- Separador `;` y montos con coma decimal (`1000,25`), porque en es-AR la coma es el separador decimal.
- BOM UTF-8 al principio, sin el cual Excel rompe las tildes, y fin de línea CRLF.
- Fecha como `dd/mm/aaaa hh:mm` en `ZONA_HORARIA`, no en UTC.
- Socio como `Apellido, Nombre`; el concepto sigue el mismo criterio que la pantalla (el del pago, o `Actividad · Tipo de membresía`, o `Pago suelto`).
- Las celdas con `;`, comillas o saltos de línea van entre comillas, y las que empiezan con `=`, `+`, `-` o `@` llevan un apóstrofo adelante para que Excel no las ejecute como fórmula (inyección de CSV).

La generación está en `pagos.csv.ts` (función pura, con tests en `tests/unit/pagos-csv.test.ts`). En el frontend, el botón "Exportar CSV" de la pantalla de Pagos lo ve solo el administrador; el nombre del archivo descargado incluye el período filtrado (`pagos_2026-11-01_a_2026-11-30.csv`).

## Importe decimal en las respuestas

El campo `monto` se serializa explícitamente como una cadena con dos decimales, por ejemplo `"1250.50"`. Así no pasa por `Number` ni pierde precisión al convertirse a JSON. Los consumidores deben tratar el importe como decimal textual.

Los pagos solo se pueden cambiar de estado mientras están `PENDIENTE`; `PAGADO` y `RECHAZADO` son estados finales.

Las pruebas específicas de filtros, aislamiento, importes y transiciones de estado están en `apps/api/tests/integration/pagos.test.ts`.

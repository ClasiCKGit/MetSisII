# Pagos

`/api/pagos` requiere sesión. Cada consulta y modificación se limita automáticamente al gimnasio del usuario autenticado.

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/pagos` | Lista pagos; permite filtrar por `socioId`, `membresiaId`, `estado`, `metodoPago`, `desde` y `hasta` |
| `GET` | `/api/pagos/:id` | Obtiene un pago con el socio y la membresía asociada |
| `POST` | `/api/pagos` | Registra un pago (ADMIN o RECEPCIONISTA) |
| `PATCH` | `/api/pagos/:id/estado` | Cambia un pago pendiente a `PAGADO` o `RECHAZADO` (ADMIN o RECEPCIONISTA) |

El alta acepta `socioId`, `monto`, `metodoPago` y opcionalmente `membresiaId`, `estado`, `concepto` y `fecha` (ISO 8601). Un `membresiaId` debe pertenecer al socio indicado. El monto acepta un número o una cadena decimal positiva de hasta dos decimales y el máximo de la columna `Decimal(10, 2)`.

## Importe decimal en las respuestas

El campo `monto` se serializa explícitamente como una cadena con dos decimales, por ejemplo `"1250.50"`. Así no pasa por `Number` ni pierde precisión al convertirse a JSON. Los consumidores deben tratar el importe como decimal textual.

Los pagos solo se pueden cambiar de estado mientras están `PENDIENTE`; `PAGADO` y `RECHAZADO` son estados finales.

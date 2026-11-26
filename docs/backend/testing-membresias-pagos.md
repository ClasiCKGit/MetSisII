# Pruebas de membresías y pagos

Las pruebas de estos módulos combinan integración contra PostgreSQL y una prueba unitaria de la vigencia calculada.

## Qué cubren

- CRUD de tipos de membresía: permisos por rol, aislamiento, validación del precio contra `Decimal(10, 2)` y baja lógica.
- Vigencia de membresías vencidas, por vencer (hoy y siete días), al día y canceladas.
- Rutas protegidas, aislamiento por gimnasio y filtros de membresías.
- Alta de inscripción junto con su pago, importe tomado del tipo de membresía y serialización decimal con dos dígitos.
- Rechazo de inscripciones sin método de pago y de duplicados, sin crear registros parciales.
- Renovación (`renovaciones.test.ts`): fecha de inicio al terminar la actual o desde hoy si venció, cambio de tipo, pago creado, doble renovación y dos renovaciones simultáneas, canceladas, cupo sin contar la renovada, tipo inválido, socio o actividad inactivos, validación del body, aislamiento, y que una renovada no cuente en los vencimientos próximos.
- Filtros de pagos por socio, estado, método y fechas inclusivas.
- Alta de pagos, rechazo de importes inválidos, aislamiento y transiciones desde `PENDIENTE`.
- Reversión de una transacción interactiva si falla una operación interna, cubierta en `tests/integration/tenant.test.ts`.

## Ejecutar

Desde la raíz del repositorio:

```powershell
npm run test -w apps/api
```

La suite deriva la base de pruebas de `DATABASE_URL`, agregando el sufijo `_test`, y aplica las migraciones antes de correr. Si necesitás usar una base específica, definí `TEST_DATABASE_URL` con un nombre terminado en `_test`. La configuración verifica ese sufijo y cancela la suite si la URL no parece una base de pruebas. Cada caso limpia las tablas antes de ejecutarse.

También se pueden ejecutar solo los módulos nuevos desde `apps/api`:

```powershell
npx vitest run tests/unit/membresia-vigencia.test.ts tests/integration/tipos-membresia.test.ts tests/integration/membresias.test.ts tests/integration/renovaciones.test.ts tests/integration/pagos.test.ts
```

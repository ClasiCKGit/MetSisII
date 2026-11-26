-- La imagen postgres:16-alpine usa musl, que no tiene reglas de orden por idioma: con la
-- collation por defecto (en_US.utf8) los textos se comparan por bytes y "Álvarez" queda
-- después de "Pérez". Las columnas que se usan para ordenar listados pasan a la collation
-- ICU de español, que ordena las letras con tilde junto a las sin tilde.
-- Prisma no modela collations en schema.prisma: este cambio vive solo en la migración.

ALTER TABLE "usuarios" ALTER COLUMN "nombre" TYPE TEXT COLLATE "es-x-icu";
ALTER TABLE "usuarios" ALTER COLUMN "apellido" TYPE TEXT COLLATE "es-x-icu";

ALTER TABLE "socios" ALTER COLUMN "nombre" TYPE TEXT COLLATE "es-x-icu";
ALTER TABLE "socios" ALTER COLUMN "apellido" TYPE TEXT COLLATE "es-x-icu";

ALTER TABLE "profesores" ALTER COLUMN "nombre" TYPE TEXT COLLATE "es-x-icu";
ALTER TABLE "profesores" ALTER COLUMN "apellido" TYPE TEXT COLLATE "es-x-icu";

ALTER TABLE "actividades" ALTER COLUMN "nombre" TYPE TEXT COLLATE "es-x-icu";

ALTER TABLE "tipos_membresia" ALTER COLUMN "nombre" TYPE TEXT COLLATE "es-x-icu";

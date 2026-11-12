import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/database";
import { tenantClient, type TenantClient } from "../../src/config/tenant";
import { crearActividadConHorario, crearGimnasio, crearSocio } from "../helpers/factories";

type Gimnasio = Awaited<ReturnType<typeof crearGimnasio>>;
type Socio = Awaited<ReturnType<typeof crearSocio>>;
type Actividad = Awaited<ReturnType<typeof crearActividadConHorario>>;

describe("aislamiento entre gimnasios (req.db)", () => {
  let gimnasioA: Gimnasio;
  let gimnasioB: Gimnasio;
  let dbA: TenantClient;
  let socioA: Socio;
  let socioB: Socio;

  beforeEach(async () => {
    gimnasioA = await crearGimnasio();
    gimnasioB = await crearGimnasio();
    dbA = tenantClient(gimnasioA.id);
    socioA = await crearSocio(gimnasioA.id);
    socioB = await crearSocio(gimnasioB.id);
  });

  describe("modelos con gimnasioId (ejemplo: Socio)", () => {
    it("findMany devuelve solo los registros del propio gimnasio", async () => {
      const socios = await dbA.socio.findMany();
      expect(socios.map((s) => s.id)).toEqual([socioA.id]);
    });

    it("findUnique por el id de otro gimnasio devuelve null", async () => {
      expect(await dbA.socio.findUnique({ where: { id: socioB.id } })).toBeNull();
    });

    it("findFirst por un dato del otro gimnasio devuelve null", async () => {
      expect(await dbA.socio.findFirst({ where: { dni: socioB.dni } })).toBeNull();
    });

    it("pedir explícitamente otro gimnasioId no devuelve nada (no pisa el filtro)", async () => {
      const socios = await dbA.socio.findMany({ where: { gimnasioId: gimnasioB.id } });
      expect(socios).toEqual([]);
    });

    it("count y aggregate solo cuentan los propios", async () => {
      await crearSocio(gimnasioB.id);
      expect(await dbA.socio.count()).toBe(1);
      expect((await dbA.socio.aggregate({ _count: true }))._count).toBe(1);
    });

    it("groupBy solo agrupa los propios", async () => {
      await crearSocio(gimnasioB.id);
      const grupos = await dbA.socio.groupBy({ by: ["activo"], _count: true });
      expect(grupos).toEqual([{ activo: true, _count: 1 }]);
    });

    it("update de un registro ajeno falla con P2025 y no lo modifica", async () => {
      await expect(
        dbA.socio.update({ where: { id: socioB.id }, data: { nombre: "HACK" } })
      ).rejects.toMatchObject({ code: "P2025" });

      const intacto = await prisma.socio.findUniqueOrThrow({ where: { id: socioB.id } });
      expect(intacto.nombre).toBe(socioB.nombre);
    });

    it("updateMany no afecta a registros ajenos", async () => {
      const resultado = await dbA.socio.updateMany({ data: { nombre: "MASIVO" } });
      expect(resultado.count).toBe(1);

      const intacto = await prisma.socio.findUniqueOrThrow({ where: { id: socioB.id } });
      expect(intacto.nombre).toBe(socioB.nombre);
    });

    it("delete de un registro ajeno falla con P2025 y no lo borra", async () => {
      await expect(dbA.socio.delete({ where: { id: socioB.id } })).rejects.toMatchObject({
        code: "P2025",
      });
      expect(await prisma.socio.findUnique({ where: { id: socioB.id } })).not.toBeNull();
    });

    it("deleteMany no borra registros ajenos", async () => {
      const resultado = await dbA.socio.deleteMany();
      expect(resultado.count).toBe(1);
      expect(await prisma.socio.count({ where: { gimnasioId: gimnasioB.id } })).toBe(1);
    });

    it("update no puede mover un registro a otro gimnasio", async () => {
      await dbA.socio.update({
        where: { id: socioA.id },
        data: { gimnasioId: gimnasioB.id, nombre: "Renombrado" },
      });

      const despues = await prisma.socio.findUniqueOrThrow({ where: { id: socioA.id } });
      expect(despues.nombre).toBe("Renombrado");
      expect(despues.gimnasioId).toBe(gimnasioA.id);
    });

    it("create fuerza el gimnasio del cliente, aunque se pase el de otro", async () => {
      const creado = await dbA.socio.create({
        data: { gimnasioId: gimnasioB.id, nombre: "Nuevo", apellido: "Socio", dni: "NUEVO-1" },
      });
      expect(creado.gimnasioId).toBe(gimnasioA.id);
    });

    it("createMany fuerza el gimnasio en cada fila", async () => {
      await dbA.socio.createMany({
        data: [
          { gimnasioId: gimnasioB.id, nombre: "Uno", apellido: "X", dni: "MASIVO-1" },
          { gimnasioId: gimnasioB.id, nombre: "Dos", apellido: "X", dni: "MASIVO-2" },
        ],
      });
      expect(await prisma.socio.count({ where: { gimnasioId: gimnasioA.id } })).toBe(3);
      expect(await prisma.socio.count({ where: { gimnasioId: gimnasioB.id } })).toBe(1);
    });

    it("upsert sobre el id de un registro ajeno no lo modifica: crea uno propio", async () => {
      await dbA.socio.upsert({
        where: { id: socioB.id },
        create: { gimnasioId: gimnasioA.id, nombre: "Creado", apellido: "X", dni: "UPSERT-1" },
        update: { nombre: "HACK" },
      });

      const ajeno = await prisma.socio.findUniqueOrThrow({ where: { id: socioB.id } });
      expect(ajeno.nombre).toBe(socioB.nombre);
      expect(await prisma.socio.count({ where: { gimnasioId: gimnasioA.id } })).toBe(2);
    });

    it("el mismo DNI puede existir en dos gimnasios, pero no repetirse dentro de uno", async () => {
      const dni = "30123456";
      await prisma.socio.create({
        data: { gimnasioId: gimnasioA.id, nombre: "A", apellido: "A", dni },
      });
      await prisma.socio.create({
        data: { gimnasioId: gimnasioB.id, nombre: "B", apellido: "B", dni },
      });

      await expect(
        dbA.socio.create({ data: { gimnasioId: gimnasioA.id, nombre: "C", apellido: "C", dni } })
      ).rejects.toMatchObject({ code: "P2002" });
    });
  });

  describe("Gimnasio (solo lectura y actualización del propio registro)", () => {
    it("findMany devuelve únicamente el propio gimnasio", async () => {
      const gimnasios = await dbA.gimnasio.findMany();
      expect(gimnasios.map((g) => g.id)).toEqual([gimnasioA.id]);
    });

    it("findUnique por el id de otro gimnasio devuelve null (no devuelve el propio)", async () => {
      expect(await dbA.gimnasio.findUnique({ where: { id: gimnasioB.id } })).toBeNull();
      expect((await dbA.gimnasio.findUnique({ where: { id: gimnasioA.id } }))?.id).toBe(
        gimnasioA.id
      );
    });

    it("se puede actualizar el propio gimnasio", async () => {
      const actualizado = await dbA.gimnasio.update({
        where: { id: gimnasioA.id },
        data: { nombre: "Nombre nuevo" },
      });
      expect(actualizado.nombre).toBe("Nombre nuevo");
    });

    it("no se puede actualizar el gimnasio de otro", async () => {
      await expect(
        dbA.gimnasio.update({ where: { id: gimnasioB.id }, data: { nombre: "HACK" } })
      ).rejects.toMatchObject({ code: "P2025" });

      const intacto = await prisma.gimnasio.findUniqueOrThrow({ where: { id: gimnasioB.id } });
      expect(intacto.nombre).toBe(gimnasioB.nombre);
    });

    it("no se puede cambiar el id del propio gimnasio", async () => {
      await dbA.gimnasio.update({
        where: { id: gimnasioA.id },
        data: { id: "otro-id", nombre: "Mismo gimnasio" },
      });

      expect(await prisma.gimnasio.findUnique({ where: { id: "otro-id" } })).toBeNull();
      const propio = await prisma.gimnasio.findUniqueOrThrow({ where: { id: gimnasioA.id } });
      expect(propio.nombre).toBe("Mismo gimnasio");
    });

    // Crear y borrar gimnasios no se hace desde req.db: el alta es el onboarding
    // (con el prisma global) y el borrado es siempre lógico.
    it.each(["create", "createMany", "upsert", "delete", "deleteMany"] as const)(
      "%s está prohibido y no llega a la base",
      async (operacion) => {
        const acciones = {
          create: () => dbA.gimnasio.create({ data: { nombre: "X", slug: "x" } }),
          createMany: () => dbA.gimnasio.createMany({ data: [{ nombre: "X", slug: "x" }] }),
          upsert: () =>
            dbA.gimnasio.upsert({
              where: { id: gimnasioA.id },
              create: { nombre: "X", slug: "x" },
              update: {},
            }),
          delete: () => dbA.gimnasio.delete({ where: { id: gimnasioA.id } }),
          deleteMany: () => dbA.gimnasio.deleteMany({ where: { id: gimnasioA.id } }),
        };

        await expect(acciones[operacion]()).rejects.toThrow(/no está permitida/);

        expect(await prisma.gimnasio.count()).toBe(2);
        expect(await prisma.socio.count({ where: { gimnasioId: gimnasioA.id } })).toBe(1);
      }
    );
  });

  describe("Horario (aislado por gimnasioId)", () => {
    let actividadA: Actividad;
    let actividadB: Actividad;

    beforeEach(async () => {
      actividadA = await crearActividadConHorario(gimnasioA.id);
      actividadB = await crearActividadConHorario(gimnasioB.id);
    });

    it("findMany devuelve solo los horarios del propio gimnasio", async () => {
      const horarios = await dbA.horario.findMany();
      expect(horarios.map((h) => h.id)).toEqual([actividadA.horarios[0].id]);
    });

    it("findUnique por el id de otro gimnasio devuelve null", async () => {
      const ajeno = actividadB.horarios[0];
      expect(await dbA.horario.findUnique({ where: { id: ajeno.id } })).toBeNull();
    });
    it("update de un horario ajeno falla con P2025 y no lo modifica", async () => {
      const ajeno = actividadB.horarios[0];

      await expect(
        dbA.horario.update({ where: { id: ajeno.id }, data: { horaInicio: "10:00" } })
      ).rejects.toMatchObject({ code: "P2025" });

      const intacto = await prisma.horario.findUniqueOrThrow({ where: { id: ajeno.id } });
      expect(intacto.horaInicio).toBe(ajeno.horaInicio);
    });

    it("delete de un horario ajeno falla con P2025 y no lo borra", async () => {
      const ajeno = actividadB.horarios[0];

      await expect(dbA.horario.delete({ where: { id: ajeno.id } })).rejects.toMatchObject({
        code: "P2025",
      });
      expect(await prisma.horario.findUnique({ where: { id: ajeno.id } })).not.toBeNull();
    });

    it("create fuerza el gimnasio del cliente, aunque se pase el de otro", async () => {
      const creado = await dbA.horario.create({
        data: {
          gimnasioId: gimnasioB.id,
          actividadId: actividadA.id,
          diaSemana: "MARTES",
          horaInicio: "10:00",
          horaFin: "11:00",
        },
      });
      expect(creado.gimnasioId).toBe(gimnasioA.id);
    });
  });

  describe("relaciones y transacciones", () => {
    it("include de relaciones devuelve solo datos del propio gimnasio", async () => {
      await crearActividadConHorario(gimnasioA.id);
      await crearActividadConHorario(gimnasioB.id);

      const actividades = await dbA.actividad.findMany({ include: { horarios: true } });
      expect(actividades).toHaveLength(1);
      expect(actividades[0].gimnasioId).toBe(gimnasioA.id);
      expect(actividades[0].horarios).toHaveLength(1);
    });

    it("$transaction interactiva mantiene el aislamiento", async () => {
      const resultado = await dbA.$transaction(async (tx) => {
        const creado = await tx.socio.create({
          data: { gimnasioId: gimnasioB.id, nombre: "En tx", apellido: "X", dni: "TX-1" },
        });
        const visibles = await tx.socio.findMany();
        return { creado, visibles };
      });

      expect(resultado.creado.gimnasioId).toBe(gimnasioA.id);
      expect(resultado.visibles.map((s) => s.gimnasioId)).toEqual([gimnasioA.id, gimnasioA.id]);
    });

    it("$transaction interactiva mantiene los bloqueos de la extensión", async () => {
      await expect(
        dbA.$transaction((tx) => tx.gimnasio.delete({ where: { id: gimnasioA.id } }))
      ).rejects.toThrow(/no está permitida/);
    });

    it("$transaction se revierte entera si algo falla adentro", async () => {
      await expect(
        dbA.$transaction(async (tx) => {
          await tx.socio.create({
            data: { gimnasioId: gimnasioA.id, nombre: "Se revierte", apellido: "X", dni: "TX-2" },
          });
          throw new Error("falla a propósito");
        })
      ).rejects.toThrow("falla a propósito");

      expect(await prisma.socio.count({ where: { dni: "TX-2" } })).toBe(0);
    });

    it("$transaction en lote (array) mantiene el aislamiento", async () => {
      const [socios, pagos] = await dbA.$transaction([dbA.socio.findMany(), dbA.pago.findMany()]);
      expect(socios.map((s) => s.id)).toEqual([socioA.id]);
      expect(pagos).toEqual([]);
    });

    // LIMITACIÓN CONOCIDA (ver "Reglas para quien escriba código nuevo" en auth.md):
    // las consultas raw no pasan por la extensión. Este test documenta el comportamiento:
    // si alguna vez se protege, va a fallar y habrá que actualizar la documentación.
    it("las consultas raw NO están aisladas: no usar $queryRaw sin filtrar por gimnasioId", async () => {
      const filas = await dbA.$queryRaw<{ id: string }[]>`SELECT id FROM socios ORDER BY id`;
      expect(filas.map((f) => f.id).sort()).toEqual([socioA.id, socioB.id].sort());
    });
  });
});

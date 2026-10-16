import { describe, expect, it, vi } from "vitest";

vi.mock("./database", () => ({ prisma: {} }));

import { TENANT_FIELD, scopeArgs } from "./tenant";

const GYM = "gimnasio-abc";

describe("scopeArgs — operaciones de lectura/borrado", () => {
  const OPS = ["findUnique", "findFirst", "findMany", "count", "delete", "deleteMany"];

  for (const op of OPS) {
    it(`${op}: inyecta el campo en where`, () => {
      const result = scopeArgs(op, { where: { nombre: "Test" } }, "gimnasioId", GYM);
      expect(result.where).toEqual({ nombre: "Test", gimnasioId: GYM });
    });
  }

  it("funciona sin where previo", () => {
    const result = scopeArgs("findMany", {}, "gimnasioId", GYM);
    expect(result.where).toEqual({ gimnasioId: GYM });
  });
});

describe("scopeArgs — create", () => {
  it("inyecta el campo en data (objeto)", () => {
    const result = scopeArgs("create", { data: { nombre: "Ana" } }, "gimnasioId", GYM);
    expect(result.data).toEqual({ nombre: "Ana", gimnasioId: GYM });
  });

  it("inyecta el campo en cada fila del array (createMany)", () => {
    const result = scopeArgs(
      "createMany",
      { data: [{ nombre: "Ana" }, { nombre: "Leo" }] },
      "gimnasioId",
      GYM
    );
    expect(result.data).toEqual([
      { nombre: "Ana", gimnasioId: GYM },
      { nombre: "Leo", gimnasioId: GYM },
    ]);
  });
});

describe("scopeArgs — update", () => {
  it("inyecta el campo en where", () => {
    const result = scopeArgs(
      "update",
      { where: { id: "1" }, data: { nombre: "Nuevo" } },
      "gimnasioId",
      GYM
    );
    expect((result.where as Record<string, unknown>).gimnasioId).toBe(GYM);
  });

  it("elimina el campo del data para evitar mover el registro a otro gimnasio", () => {
    const result = scopeArgs(
      "update",
      { where: { id: "1" }, data: { nombre: "Nuevo", gimnasioId: "otro-gym" } },
      "gimnasioId",
      GYM
    );
    expect(result.data).toEqual({ nombre: "Nuevo" });
  });
});

describe("TENANT_FIELD — modelos esperados", () => {
  const CON_GIMNASIO_ID = [
    "Usuario",
    "Socio",
    "Profesor",
    "Actividad",
    "ActividadProfesor",
    "TipoMembresia",
    "Membresia",
    "Pago",
  ];

  for (const model of CON_GIMNASIO_ID) {
    it(`${model} usa "gimnasioId"`, () => {
      expect(TENANT_FIELD[model]).toBe("gimnasioId");
    });
  }

  it('Gimnasio usa "id"', () => {
    expect(TENANT_FIELD["Gimnasio"]).toBe("id");
  });

  it("Horario no está en la tabla todavía", () => {
    expect(TENANT_FIELD["Horario"]).toBeUndefined();
  });
});

describe("scopeArgs con Gimnasio (field = id)", () => {
  it("findMany agrega where: { id: gimnasioId }", () => {
    const result = scopeArgs("findMany", {}, "id", GYM);
    expect(result.where).toEqual({ id: GYM });
  });

  it("update protege el campo id en data", () => {
    const result = scopeArgs(
      "update",
      { where: {}, data: { nombre: "Gym", id: "otro-id" } },
      "id",
      GYM
    );
    expect((result.where as Record<string, unknown>).id).toBe(GYM);
    expect((result.data as Record<string, unknown>).id).toBeUndefined();
  });
});

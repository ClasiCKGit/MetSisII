import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import {
  conToken,
  crearActividad,
  crearEscenario,
  crearProfesor,
  crearSocio,
  crearUsuario,
} from "../helpers/factories";

const app = createApp();

// Desordenados a propósito. En español la Ñ va después de la N y las vocales con tilde
// se ordenan junto a las sin tilde; comparando por bytes "Álvarez" quedaría último.
const APELLIDOS = ["Pérez", "Ñandú", "Ortiz", "Álvarez", "Núñez"];
const ORDENADOS = ["Álvarez", "Núñez", "Ñandú", "Ortiz", "Pérez"];

describe("los listados ordenan alfabéticamente en español", () => {
  it("socios por apellido", async () => {
    const { a } = await crearEscenario();
    for (const apellido of APELLIDOS) await crearSocio(a.gimnasio.id, { apellido });

    const res = await request(app).get("/api/socios").set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body.map((s: { apellido: string }) => s.apellido)).toEqual(ORDENADOS);
  });

  it("profesores por apellido", async () => {
    const { a } = await crearEscenario();
    for (const apellido of APELLIDOS) await crearProfesor(a.gimnasio.id, { apellido });

    const res = await request(app).get("/api/profesores").set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body.map((p: { apellido: string }) => p.apellido)).toEqual(ORDENADOS);
  });

  it("usuarios por apellido", async () => {
    const { a } = await crearEscenario();
    for (const apellido of APELLIDOS) await crearUsuario(a.gimnasio.id, { apellido });

    const res = await request(app).get("/api/usuarios").set(conToken(a.token));

    expect(res.status).toBe(200);
    const apellidos = res.body
      .map((u: { apellido: string }) => u.apellido)
      .filter((apellido: string) => APELLIDOS.includes(apellido));
    expect(apellidos).toEqual(ORDENADOS);
  });

  it("actividades por nombre", async () => {
    const { a } = await crearEscenario();
    for (const nombre of ["Zumba", "Ñandutí", "Natación", "Ácrobacia", "Boxeo"]) {
      await crearActividad(a.gimnasio.id, { nombre });
    }

    const res = await request(app).get("/api/actividades").set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body.map((x: { nombre: string }) => x.nombre)).toEqual([
      "Ácrobacia",
      "Boxeo",
      "Natación",
      "Ñandutí",
      "Zumba",
    ]);
  });
});

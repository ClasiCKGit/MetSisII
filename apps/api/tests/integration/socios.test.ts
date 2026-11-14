import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/database";
import { conToken, crearEscenario, crearSocio, crearUsuario, tokenDe } from "../helpers/factories";

const app = createApp();

type SocioRespuesta = { nombre: string; apellido: string; dni: string; activo: boolean };

describe("acceso a /api/socios", () => {
  it("exige sesión", async () => {
    const res = await request(app).get("/api/socios");
    expect(res.status).toBe(401);
  });

  it("un recepcionista consulta, crea y edita datos, pero no da de baja ni reactiva (403)", async () => {
    const { a } = await crearEscenario();
    const recepcion = await crearUsuario(a.gimnasio.id);
    const token = conToken(tokenDe(recepcion));
    const socio = await crearSocio(a.gimnasio.id);
    const inactivo = await crearSocio(a.gimnasio.id, { activo: false });

    const lectura = await request(app).get("/api/socios").set(token);
    expect(lectura.status).toBe(200);

    const alta = await request(app)
      .post("/api/socios")
      .set(token)
      .send({ nombre: "Juan", apellido: "Pérez", dni: "30123456" });
    expect(alta.status).toBe(201);

    const edicion = await request(app)
      .patch(`/api/socios/${socio.id}`)
      .set(token)
      .send({ nombre: "Otro" });
    expect(edicion.status).toBe(200);

    const respuestas = await Promise.all([
      request(app).patch(`/api/socios/${socio.id}`).set(token).send({ activo: false }),
      request(app).patch(`/api/socios/${inactivo.id}`).set(token).send({ activo: true }),
      request(app).delete(`/api/socios/${socio.id}`).set(token),
    ]);
    expect(respuestas.map((r) => r.status)).toEqual([403, 403, 403]);

    expect((await prisma.socio.findUniqueOrThrow({ where: { id: socio.id } })).activo).toBe(true);
    expect((await prisma.socio.findUniqueOrThrow({ where: { id: inactivo.id } })).activo).toBe(
      false
    );
  });
});

describe("GET /api/socios", () => {
  it("lista solo los socios del propio gimnasio, ordenados por apellido y nombre", async () => {
    const { a, b } = await crearEscenario();
    await crearSocio(a.gimnasio.id, { apellido: "Zamora", nombre: "Luis" });
    await crearSocio(a.gimnasio.id, { apellido: "Alonso", nombre: "Beto" });
    await crearSocio(a.gimnasio.id, { apellido: "Alonso", nombre: "Ana" });
    await crearSocio(b.gimnasio.id, { apellido: "Ajeno" });

    const res = await request(app).get("/api/socios").set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body.map((s: SocioRespuesta) => `${s.apellido} ${s.nombre}`)).toEqual([
      "Alonso Ana",
      "Alonso Beto",
      "Zamora Luis",
    ]);
  });

  it("filtra por estado con ?activo", async () => {
    const { a } = await crearEscenario();
    await crearSocio(a.gimnasio.id, { activo: true });
    await crearSocio(a.gimnasio.id, { activo: false });
    const consultar = (query: object) =>
      request(app).get("/api/socios").query(query).set(conToken(a.token));

    expect((await consultar({})).body).toHaveLength(2);

    const activos = await consultar({ activo: true });
    expect(activos.body).toHaveLength(1);
    expect(activos.body[0].activo).toBe(true);

    const inactivos = await consultar({ activo: false });
    expect(inactivos.body).toHaveLength(1);
    expect(inactivos.body[0].activo).toBe(false);
  });

  it("busca por nombre, apellido o DNI sin distinguir mayúsculas, solo en el propio gimnasio", async () => {
    const { a, b } = await crearEscenario();
    await crearSocio(a.gimnasio.id, { nombre: "Marcela", apellido: "Gomez", dni: "30111222" });
    await crearSocio(a.gimnasio.id, { nombre: "Pedro", apellido: "Lopez", dni: "40999888" });
    await crearSocio(b.gimnasio.id, { nombre: "Marcela", apellido: "Gomez", dni: "30111999" });
    const dnisPara = async (q: string) => {
      const res = await request(app).get("/api/socios").query({ q }).set(conToken(a.token));
      return res.body.map((s: SocioRespuesta) => s.dni);
    };

    expect(await dnisPara("GOMEZ")).toEqual(["30111222"]);
    expect(await dnisPara("marce")).toEqual(["30111222"]);
    expect(await dnisPara("4099")).toEqual(["40999888"]);
    expect(await dnisPara("zzz")).toEqual([]);
  });

  it("responde 400 si ?activo no es true ni false", async () => {
    const { a } = await crearEscenario();
    const res = await request(app).get("/api/socios?activo=quizas").set(conToken(a.token));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/socios/:id", () => {
  it("devuelve el socio", async () => {
    const { a } = await crearEscenario();
    const socio = await crearSocio(a.gimnasio.id);

    const res = await request(app).get(`/api/socios/${socio.id}`).set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: socio.id, apellido: socio.apellido });
  });

  it("responde 404 para un socio de otro gimnasio", async () => {
    const { a, b } = await crearEscenario();
    const ajeno = await crearSocio(b.gimnasio.id);

    const res = await request(app).get(`/api/socios/${ajeno.id}`).set(conToken(a.token));
    expect(res.status).toBe(404);
  });

  it("responde 404 para un id inexistente y 400 si no es un UUID", async () => {
    const { a } = await crearEscenario();
    const consultar = (id: string) => request(app).get(`/api/socios/${id}`).set(conToken(a.token));

    expect((await consultar(randomUUID())).status).toBe(404);
    expect((await consultar("abc")).status).toBe(400);
  });
});

describe("POST /api/socios", () => {
  const nuevo = { nombre: "Juan", apellido: "Pérez", dni: "30123456" };

  it("crea el socio en el gimnasio de quien lo da de alta", async () => {
    const { a } = await crearEscenario();

    const res = await request(app).post("/api/socios").set(conToken(a.token)).send(nuevo);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ...nuevo, activo: true, gimnasioId: a.gimnasio.id });
  });

  it("ignora un gimnasioId enviado en el body", async () => {
    const { a, b } = await crearEscenario();

    const res = await request(app)
      .post("/api/socios")
      .set(conToken(a.token))
      .send({ ...nuevo, gimnasioId: b.gimnasio.id });

    expect(res.status).toBe(201);
    const guardado = await prisma.socio.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(guardado.gimnasioId).toBe(a.gimnasio.id);
  });

  it("guarda los datos opcionales, recorta los espacios y normaliza el email", async () => {
    const { a } = await crearEscenario();

    const res = await request(app)
      .post("/api/socios")
      .set(conToken(a.token))
      .send({
        ...nuevo,
        nombre: "  Juan ",
        email: "  JUAN@Mail.COM ",
        telefono: "291-5551234",
        fechaNacimiento: "1990-05-20",
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      nombre: "Juan",
      email: "juan@mail.com",
      telefono: "291-5551234",
    });
    expect(res.body.fechaNacimiento).toMatch(/^1990-05-20/);
  });

  it("rechaza un DNI repetido en el gimnasio (409), aunque el socio esté dado de baja", async () => {
    const { a } = await crearEscenario();
    await crearSocio(a.gimnasio.id, { dni: nuevo.dni, activo: false });

    const res = await request(app).post("/api/socios").set(conToken(a.token)).send(nuevo);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Ya existe un socio/);
  });

  it("permite el mismo DNI en otro gimnasio", async () => {
    const { a, b } = await crearEscenario();
    await crearSocio(b.gimnasio.id, { dni: nuevo.dni });

    const res = await request(app).post("/api/socios").set(conToken(a.token)).send(nuevo);
    expect(res.status).toBe(201);
  });

  it("dos altas simultáneas con el mismo DNI: una se crea y la otra recibe 409", async () => {
    const { a } = await crearEscenario();

    const [r1, r2] = await Promise.all([
      request(app).post("/api/socios").set(conToken(a.token)).send(nuevo),
      request(app).post("/api/socios").set(conToken(a.token)).send(nuevo),
    ]);

    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
    expect(await prisma.socio.count({ where: { gimnasioId: a.gimnasio.id } })).toBe(1);
  });

  it.each([
    ["DNI con puntos", { dni: "30.123.456" }],
    ["DNI demasiado corto", { dni: "123" }],
    ["nombre vacío", { nombre: "   " }],
    ["email inválido", { email: "no-es-email" }],
    ["fecha de nacimiento futura", { fechaNacimiento: "2999-01-01" }],
    ["fecha de nacimiento inválida", { fechaNacimiento: "no-es-fecha" }],
  ])("rechaza con 400: %s", async (_caso, cambio) => {
    const { a } = await crearEscenario();

    const res = await request(app)
      .post("/api/socios")
      .set(conToken(a.token))
      .send({ ...nuevo, ...cambio });

    expect(res.status).toBe(400);
    expect(await prisma.socio.count({ where: { gimnasioId: a.gimnasio.id } })).toBe(0);
  });
});

describe("PATCH /api/socios/:id", () => {
  const patch = (token: string, id: string, body: object) =>
    request(app).patch(`/api/socios/${id}`).set(conToken(token)).send(body);

  it("actualiza los campos indicados", async () => {
    const { a } = await crearEscenario();
    const socio = await crearSocio(a.gimnasio.id);

    const res = await patch(a.token, socio.id, { nombre: "Lucía", telefono: "291-1234567" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: socio.id, nombre: "Lucía", telefono: "291-1234567" });
  });

  it("permite borrar un campo opcional mandando null", async () => {
    const { a } = await crearEscenario();
    const socio = await prisma.socio.create({
      data: {
        gimnasioId: a.gimnasio.id,
        nombre: "Ana",
        apellido: "Paz",
        dni: "28111222",
        email: "ana@mail.com",
        telefono: "291-1234567",
        fechaNacimiento: new Date("1990-05-20"),
      },
    });

    const res = await patch(a.token, socio.id, {
      email: null,
      telefono: null,
      fechaNacimiento: null,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: null, telefono: null, fechaNacimiento: null });
  });

  it("un administrador da de baja y reactiva con activo (baja lógica)", async () => {
    const { a } = await crearEscenario();
    const socio = await crearSocio(a.gimnasio.id);

    expect((await patch(a.token, socio.id, { activo: false })).body.activo).toBe(false);
    expect((await prisma.socio.findUniqueOrThrow({ where: { id: socio.id } })).activo).toBe(false);
    expect((await patch(a.token, socio.id, { activo: true })).body.activo).toBe(true);
  });

  it("rechaza con 409 un DNI que ya tiene otro socio del gimnasio", async () => {
    const { a } = await crearEscenario();
    await crearSocio(a.gimnasio.id, { dni: "30123456" });
    const otro = await crearSocio(a.gimnasio.id, { dni: "30999888" });

    const res = await patch(a.token, otro.id, { dni: "30123456" });

    expect(res.status).toBe(409);
    expect((await prisma.socio.findUniqueOrThrow({ where: { id: otro.id } })).dni).toBe("30999888");
  });

  it("responde 404 para un socio de otro gimnasio y no lo modifica", async () => {
    const { a, b } = await crearEscenario();
    const ajeno = await crearSocio(b.gimnasio.id);

    const res = await patch(a.token, ajeno.id, { nombre: "Hackeado", activo: false });

    expect(res.status).toBe(404);
    const intacto = await prisma.socio.findUniqueOrThrow({ where: { id: ajeno.id } });
    expect(intacto.nombre).toBe(ajeno.nombre);
    expect(intacto.activo).toBe(true);
  });

  it("responde 404 para un id inexistente y 400 para uno que no es UUID", async () => {
    const { a } = await crearEscenario();
    expect((await patch(a.token, randomUUID(), { nombre: "X" })).status).toBe(404);
    expect((await patch(a.token, "no-es-un-uuid", { nombre: "X" })).status).toBe(400);
  });

  it.each([
    ["gimnasioId", { gimnasioId: "otro" }],
    ["id", { id: "otro" }],
    ["createdAt", { createdAt: "2020-01-01" }],
    ["un campo inventado", { cualquierCosa: true }],
  ])(
    "rechaza con 400 el campo no permitido: %s (no lo ignora en silencio)",
    async (_caso, body) => {
      const { a } = await crearEscenario();
      const socio = await crearSocio(a.gimnasio.id);

      const res = await patch(a.token, socio.id, { nombre: "Otro", ...body });

      expect(res.status).toBe(400);
      expect((await prisma.socio.findUniqueOrThrow({ where: { id: socio.id } })).nombre).toBe(
        socio.nombre
      );
    }
  );

  it("rechaza con 400 un body vacío", async () => {
    const { a } = await crearEscenario();
    const socio = await crearSocio(a.gimnasio.id);
    expect((await patch(a.token, socio.id, {})).status).toBe(400);
  });
});

describe("DELETE /api/socios/:id", () => {
  const borrar = (token: string, id: string) =>
    request(app).delete(`/api/socios/${id}`).set(conToken(token));

  it("da de baja al socio sin borrar la fila", async () => {
    const { a } = await crearEscenario();
    const socio = await crearSocio(a.gimnasio.id);

    const res = await borrar(a.token, socio.id);

    expect(res.status).toBe(200);
    expect(res.body.activo).toBe(false);
    const enBase = await prisma.socio.findUniqueOrThrow({ where: { id: socio.id } });
    expect(enBase.activo).toBe(false);
  });

  it("responde 404 para un socio de otro gimnasio y no lo modifica", async () => {
    const { a, b } = await crearEscenario();
    const ajeno = await crearSocio(b.gimnasio.id);

    const res = await borrar(a.token, ajeno.id);

    expect(res.status).toBe(404);
    expect((await prisma.socio.findUniqueOrThrow({ where: { id: ajeno.id } })).activo).toBe(true);
  });

  it("responde 404 para un id inexistente y 400 para uno que no es UUID", async () => {
    const { a } = await crearEscenario();
    expect((await borrar(a.token, randomUUID())).status).toBe(404);
    expect((await borrar(a.token, "abc")).status).toBe(400);
  });
});

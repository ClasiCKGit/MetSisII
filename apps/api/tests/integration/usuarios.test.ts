import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/database";
import { comparePassword } from "../../src/utils/password";
import { conToken, crearEscenario, crearUsuario, PASSWORD, tokenDe } from "../helpers/factories";

const app = createApp();

describe("acceso a /api/usuarios", () => {
  it("exige sesión", async () => {
    const res = await request(app).get("/api/usuarios");
    expect(res.status).toBe(401);
  });

  it("un recepcionista no puede usar ninguna ruta de gestión (403)", async () => {
    const { a } = await crearEscenario();
    const recepcion = await crearUsuario(a.gimnasio.id);
    const token = conToken(tokenDe(recepcion));
    const otro = await crearUsuario(a.gimnasio.id);

    const respuestas = await Promise.all([
      request(app).get("/api/usuarios").set(token),
      request(app).post("/api/usuarios").set(token).send({}),
      request(app).patch(`/api/usuarios/${otro.id}`).set(token).send({ nombre: "X" }),
      request(app)
        .post(`/api/usuarios/${otro.id}/reset-password`)
        .set(token)
        .send({ password: "nueva-123456" }),
    ]);

    expect(respuestas.map((r) => r.status)).toEqual([403, 403, 403, 403]);
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: otro.id } })).nombre).toBe(
      otro.nombre
    );
  });
});

describe("GET /api/usuarios", () => {
  it("lista solo los usuarios del propio gimnasio, ordenados y sin passwordHash", async () => {
    const { a } = await crearEscenario();
    await crearUsuario(a.gimnasio.id, { apellido: "Zamora" });
    await crearUsuario(a.gimnasio.id, { apellido: "Alonso" });
    await crearEscenario(); // otros dos gimnasios con sus usuarios

    const res = await request(app).get("/api/usuarios").set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    // El administrador del escenario queda en el medio (su apellido empieza con "Ap")
    const apellidos = res.body.map((u: { apellido: string }) => u.apellido);
    expect(apellidos[0]).toBe("Alonso");
    expect(apellidos[2]).toBe("Zamora");
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(Object.keys(res.body[0]).sort()).toEqual(
      ["activo", "apellido", "createdAt", "email", "id", "nombre", "rol"].sort()
    );
  });

  it("incluye a los usuarios desactivados", async () => {
    const { a } = await crearEscenario();
    await crearUsuario(a.gimnasio.id, { activo: false });

    const res = await request(app).get("/api/usuarios").set(conToken(a.token));
    expect(res.body.filter((u: { activo: boolean }) => !u.activo)).toHaveLength(1);
  });
});

describe("POST /api/usuarios", () => {
  const nuevo = {
    nombre: "Dani",
    apellido: "Gómez",
    email: "dani@mail.com",
    password: "clave-123456",
  };

  it("crea un usuario en el gimnasio del administrador, como RECEPCIONISTA por defecto", async () => {
    const { a } = await crearEscenario();

    const res = await request(app).post("/api/usuarios").set(conToken(a.token)).send(nuevo);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: "dani@mail.com", rol: "RECEPCIONISTA", activo: true });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");

    const guardado = await prisma.usuario.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(guardado.gimnasioId).toBe(a.gimnasio.id);
    expect(await comparePassword("clave-123456", guardado.passwordHash)).toBe(true);
  });

  it("el usuario creado puede iniciar sesión con su contraseña", async () => {
    const { a } = await crearEscenario();
    await request(app).post("/api/usuarios").set(conToken(a.token)).send(nuevo);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ gimnasioSlug: a.gimnasio.slug, email: "dani@mail.com", password: "clave-123456" });
    expect(login.status).toBe(200);
  });

  it("permite crear otro administrador indicando el rol", async () => {
    const { a } = await crearEscenario();
    const res = await request(app)
      .post("/api/usuarios")
      .set(conToken(a.token))
      .send({ ...nuevo, rol: "ADMIN" });
    expect(res.body.rol).toBe("ADMIN");
  });

  it("normaliza el email y recorta los nombres", async () => {
    const { a } = await crearEscenario();
    const res = await request(app)
      .post("/api/usuarios")
      .set(conToken(a.token))
      .send({ ...nuevo, nombre: "  Dani ", email: "  DANI@Mail.COM " });
    expect(res.body).toMatchObject({ nombre: "Dani", email: "dani@mail.com" });
  });

  it("rechaza un email que ya existe en el gimnasio (409), aunque el usuario esté desactivado", async () => {
    const { a } = await crearEscenario();
    await crearUsuario(a.gimnasio.id, { email: "dani@mail.com", activo: false });

    const res = await request(app).post("/api/usuarios").set(conToken(a.token)).send(nuevo);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Ya existe un usuario/);
  });

  it("permite el mismo email que existe en otro gimnasio", async () => {
    const { a, b } = await crearEscenario();
    await crearUsuario(b.gimnasio.id, { email: "dani@mail.com" });

    const res = await request(app).post("/api/usuarios").set(conToken(a.token)).send(nuevo);
    expect(res.status).toBe(201);
  });

  it("dos altas simultáneas con el mismo email: una se crea y la otra recibe 409", async () => {
    const { a } = await crearEscenario();

    const [r1, r2] = await Promise.all([
      request(app).post("/api/usuarios").set(conToken(a.token)).send(nuevo),
      request(app).post("/api/usuarios").set(conToken(a.token)).send(nuevo),
    ]);

    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
    expect(await prisma.usuario.count({ where: { email: "dani@mail.com" } })).toBe(1);
  });

  it.each([
    ["contraseña corta", { password: "corta" }],
    ["email inválido", { email: "no-es-email" }],
    ["rol inexistente", { rol: "SUPERADMIN" }],
    ["nombre vacío", { nombre: "   " }],
  ])("rechaza con 400: %s", async (_caso, cambio) => {
    const { a } = await crearEscenario();
    const res = await request(app)
      .post("/api/usuarios")
      .set(conToken(a.token))
      .send({ ...nuevo, ...cambio });
    expect(res.status).toBe(400);
    expect(await prisma.usuario.count({ where: { email: "dani@mail.com" } })).toBe(0);
  });
});

describe("PATCH /api/usuarios/:id", () => {
  const patch = (token: string, id: string, body: object) =>
    request(app).patch(`/api/usuarios/${id}`).set(conToken(token)).send(body);

  it("actualiza nombre, apellido, rol y estado de otro usuario", async () => {
    const { a } = await crearEscenario();
    const usuario = await crearUsuario(a.gimnasio.id);

    const res = await patch(a.token, usuario.id, {
      nombre: "Daniela",
      apellido: "Nueva",
      rol: "ADMIN",
      activo: false,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      nombre: "Daniela",
      apellido: "Nueva",
      rol: "ADMIN",
      activo: false,
    });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("un usuario desactivado pierde el acceso en el acto, y reactivarlo se lo devuelve", async () => {
    const { a } = await crearEscenario();
    const usuario = await crearUsuario(a.gimnasio.id);
    const token = tokenDe(usuario);

    await patch(a.token, usuario.id, { activo: false });
    expect((await request(app).get("/api/auth/me").set(conToken(token))).status).toBe(401);

    await patch(a.token, usuario.id, { activo: true });
    expect((await request(app).get("/api/auth/me").set(conToken(token))).status).toBe(200);
  });

  it("rechaza un body sin campos (400)", async () => {
    const { a } = await crearEscenario();
    const usuario = await crearUsuario(a.gimnasio.id);
    expect((await patch(a.token, usuario.id, {})).status).toBe(400);
  });

  it.each([
    ["email", { email: "nuevo@mail.com" }],
    ["passwordHash", { passwordHash: "x" }],
    ["gimnasioId", { gimnasioId: "otro" }],
    ["un campo inventado", { cualquierCosa: true }],
  ])(
    "rechaza con 400 el campo no permitido: %s (no lo ignora en silencio)",
    async (_caso, body) => {
      const { a } = await crearEscenario();
      const usuario = await crearUsuario(a.gimnasio.id);
      const res = await patch(a.token, usuario.id, { nombre: "Otro", ...body });
      expect(res.status).toBe(400);
      expect((await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } })).nombre).toBe(
        usuario.nombre
      );
    }
  );

  it("rechaza con 400 un id que no es un UUID", async () => {
    const { a } = await crearEscenario();
    expect((await patch(a.token, "no-es-un-uuid", { nombre: "X" })).status).toBe(400);
  });

  it("responde 404 para un id inexistente", async () => {
    const { a } = await crearEscenario();
    expect((await patch(a.token, randomUUID(), { nombre: "X" })).status).toBe(404);
  });

  it("responde 404 para un usuario de otro gimnasio, y no lo modifica", async () => {
    const { a, b } = await crearEscenario();

    const res = await patch(a.token, b.admin.id, { nombre: "HACK", activo: false });

    expect(res.status).toBe(404);
    const intacto = await prisma.usuario.findUniqueOrThrow({ where: { id: b.admin.id } });
    expect(intacto.nombre).toBe(b.admin.nombre);
    expect(intacto.activo).toBe(true);
  });

  describe("un administrador no puede perder su propio acceso de administrador", () => {
    it("no puede desactivarse", async () => {
      const { a } = await crearEscenario();
      const res = await patch(a.token, a.admin.id, { activo: false });
      expect(res.status).toBe(409);
      expect((await prisma.usuario.findUniqueOrThrow({ where: { id: a.admin.id } })).activo).toBe(
        true
      );
    });

    it("no puede quitarse el rol de administrador", async () => {
      const { a } = await crearEscenario();
      const res = await patch(a.token, a.admin.id, { rol: "RECEPCIONISTA" });
      expect(res.status).toBe(409);
      expect((await prisma.usuario.findUniqueOrThrow({ where: { id: a.admin.id } })).rol).toBe(
        "ADMIN"
      );
    });

    it("sí puede editar su nombre, o 'cambiar' a su mismo rol", async () => {
      const { a } = await crearEscenario();
      const res = await patch(a.token, a.admin.id, { nombre: "Nuevo nombre", rol: "ADMIN" });
      expect(res.status).toBe(200);
      expect(res.body.nombre).toBe("Nuevo nombre");
    });

    it("un administrador sí puede desactivar o degradar a otro administrador", async () => {
      const { a } = await crearEscenario();
      const otroAdmin = await crearUsuario(a.gimnasio.id, { rol: "ADMIN" });

      expect((await patch(a.token, otroAdmin.id, { rol: "RECEPCIONISTA" })).status).toBe(200);
      expect((await patch(a.token, otroAdmin.id, { activo: false })).status).toBe(200);
    });

    it("el gimnasio nunca queda sin un administrador activo", async () => {
      const { a } = await crearEscenario();
      const otroAdmin = await crearUsuario(a.gimnasio.id, { rol: "ADMIN" });

      // El segundo admin degrada y desactiva al primero...
      expect((await patch(tokenDe(otroAdmin), a.admin.id, { rol: "RECEPCIONISTA" })).status).toBe(
        200
      );
      // ...y ya no puede hacerlo sobre sí mismo
      expect((await patch(tokenDe(otroAdmin), otroAdmin.id, { activo: false })).status).toBe(409);

      expect(
        await prisma.usuario.count({
          where: { gimnasioId: a.gimnasio.id, rol: "ADMIN", activo: true },
        })
      ).toBe(1);
    });
  });
});

describe("POST /api/usuarios/:id/reset-password", () => {
  const reset = (token: string, id: string, body: object) =>
    request(app).post(`/api/usuarios/${id}/reset-password`).set(conToken(token)).send(body);

  it("fija una contraseña nueva a otro usuario, que ya puede iniciar sesión con ella", async () => {
    const { a } = await crearEscenario();
    const usuario = await crearUsuario(a.gimnasio.id);

    const res = await reset(a.token, usuario.id, { password: "reseteada-123" });
    expect(res.status).toBe(204);
    expect(res.text).toBe("");

    const login = (password: string) =>
      request(app)
        .post("/api/auth/login")
        .send({ gimnasioSlug: a.gimnasio.slug, email: usuario.email, password });
    expect((await login("reseteada-123")).status).toBe(200);
    expect((await login(PASSWORD)).status).toBe(401);
  });

  it("cierra todas las sesiones abiertas del usuario reseteado, pero no la del admin", async () => {
    const { a } = await crearEscenario();
    const usuario = await crearUsuario(a.gimnasio.id);
    const sesionDelUsuario = tokenDe(usuario);
    const me = (token: string) => request(app).get("/api/auth/me").set(conToken(token));

    expect((await reset(a.token, usuario.id, { password: "reseteada-123" })).status).toBe(204);

    expect((await me(sesionDelUsuario)).status).toBe(401);
    expect((await me(a.token)).status).toBe(200);
    const enBase = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(enBase.tokenVersion).toBe(usuario.tokenVersion + 1);
  });

  it("no permite resetear la propia contraseña por esta vía (409)", async () => {
    const { a } = await crearEscenario();
    const res = await reset(a.token, a.admin.id, { password: "reseteada-123" });
    expect(res.status).toBe(409);

    const intacto = await prisma.usuario.findUniqueOrThrow({ where: { id: a.admin.id } });
    expect(await comparePassword(PASSWORD, intacto.passwordHash)).toBe(true);
  });

  it("responde 404 para un usuario de otro gimnasio, y no cambia su contraseña", async () => {
    const { a, b } = await crearEscenario();

    const res = await reset(a.token, b.admin.id, { password: "reseteada-123" });

    expect(res.status).toBe(404);
    const intacto = await prisma.usuario.findUniqueOrThrow({ where: { id: b.admin.id } });
    expect(await comparePassword(PASSWORD, intacto.passwordHash)).toBe(true);
    expect(intacto.tokenVersion).toBe(b.admin.tokenVersion);
    expect((await request(app).get("/api/auth/me").set(conToken(b.token))).status).toBe(200);
  });

  it("responde 404 para un id inexistente y 400 para uno con formato inválido", async () => {
    const { a } = await crearEscenario();
    expect((await reset(a.token, randomUUID(), { password: "reseteada-123" })).status).toBe(404);
    expect((await reset(a.token, "no-es-un-uuid", { password: "reseteada-123" })).status).toBe(400);
  });

  it("rechaza una contraseña corta (400)", async () => {
    const { a } = await crearEscenario();
    const usuario = await crearUsuario(a.gimnasio.id);
    expect((await reset(a.token, usuario.id, { password: "corta" })).status).toBe(400);
  });
});

import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/database";
import { comparePassword } from "../../src/utils/password";
import {
  conToken,
  crearEscenario,
  crearGimnasio,
  crearUsuario,
  PASSWORD,
  tokenDe,
} from "../helpers/factories";

const app = createApp();

// Debe coincidir con el JWT_SECRET que fija tests/env.ts
const JWT_SECRET = process.env.JWT_SECRET as string;

describe("POST /api/auth/register-gimnasio", () => {
  const body = {
    gimnasio: { nombre: "Gym Test", slug: "gym-test" },
    admin: { nombre: "Ana", apellido: "Test", email: "ana@gymtest.com", password: "password123" },
  };

  it("crea el gimnasio y su administrador y devuelve la sesión", async () => {
    const res = await request(app).post("/api/auth/register-gimnasio").send(body);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.usuario).toMatchObject({ email: "ana@gymtest.com", rol: "ADMIN" });
    expect(res.body.gimnasio).toMatchObject({ nombre: "Gym Test", slug: "gym-test" });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");

    const usuario = await prisma.usuario.findFirstOrThrow({ where: { email: "ana@gymtest.com" } });
    expect(usuario.gimnasioId).toBe(res.body.gimnasio.id);
    expect(usuario.passwordHash).not.toBe("password123");
    expect(await comparePassword("password123", usuario.passwordHash)).toBe(true);
  });

  it("el token devuelto permite entrar a /me", async () => {
    const registro = await request(app).post("/api/auth/register-gimnasio").send(body);
    const me = await request(app).get("/api/auth/me").set(conToken(registro.body.token));
    expect(me.status).toBe(200);
    expect(me.body.usuario.email).toBe("ana@gymtest.com");
  });

  it("normaliza el slug y el email", async () => {
    const res = await request(app)
      .post("/api/auth/register-gimnasio")
      .send({
        gimnasio: { nombre: "Gym", slug: "  GYM-Mayus  " },
        admin: { ...body.admin, email: "  ANA@GymTest.COM " },
      });
    expect(res.status).toBe(201);
    expect(res.body.gimnasio.slug).toBe("gym-mayus");
    expect(res.body.usuario.email).toBe("ana@gymtest.com");
  });

  it("rechaza un slug repetido con 409", async () => {
    await request(app).post("/api/auth/register-gimnasio").send(body);
    const res = await request(app).post("/api/auth/register-gimnasio").send(body);
    expect(res.status).toBe(409);
    expect(await prisma.gimnasio.count()).toBe(1);
  });

  it.each(["api", "admin", "www"])("rechaza el slug reservado %s", async (slug) => {
    const res = await request(app)
      .post("/api/auth/register-gimnasio")
      .send({ ...body, gimnasio: { nombre: "Gym", slug } });
    expect(res.status).toBe(400);
  });

  it.each([
    ["contraseña corta", { admin: { ...body.admin, password: "corta" } }],
    ["email inválido", { admin: { ...body.admin, email: "no-es-un-email" } }],
    ["slug con caracteres inválidos", { gimnasio: { nombre: "Gym", slug: "con espacios" } }],
    ["slug con guion al inicio", { gimnasio: { nombre: "Gym", slug: "-gym" } }],
    ["sin administrador", { admin: undefined }],
  ])("rechaza con 400: %s", async (_caso, cambio) => {
    const res = await request(app)
      .post("/api/auth/register-gimnasio")
      .send({ ...body, ...cambio });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Error de validación");
    expect(await prisma.gimnasio.count()).toBe(0);
  });

  it("rechaza un body vacío con 400", async () => {
    const res = await request(app).post("/api/auth/register-gimnasio");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("con credenciales correctas devuelve la sesión, sin passwordHash", async () => {
    const gimnasio = await crearGimnasio({ slug: "mi-gym" });
    const usuario = await crearUsuario(gimnasio.id, { rol: "ADMIN" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ gimnasioSlug: "mi-gym", email: usuario.email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.usuario).toMatchObject({ id: usuario.id, rol: "ADMIN" });
    expect(res.body.gimnasio).toMatchObject({ id: gimnasio.id, slug: "mi-gym" });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");

    const me = await request(app).get("/api/auth/me").set(conToken(res.body.token));
    expect(me.status).toBe(200);
  });

  it("acepta el email y el slug con mayúsculas y espacios", async () => {
    const gimnasio = await crearGimnasio({ slug: "mi-gym" });
    const usuario = await crearUsuario(gimnasio.id, { email: "ana@mail.com" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ gimnasioSlug: "  MI-GYM ", email: " ANA@Mail.com ", password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.usuario.id).toBe(usuario.id);
  });

  describe("credenciales inválidas (siempre el mismo 401, sin revelar qué falló)", () => {
    it("contraseña incorrecta, email inexistente y gimnasio inexistente dan la misma respuesta", async () => {
      const gimnasio = await crearGimnasio({ slug: "mi-gym" });
      const usuario = await crearUsuario(gimnasio.id);

      const passwordIncorrecta = await request(app)
        .post("/api/auth/login")
        .send({ gimnasioSlug: "mi-gym", email: usuario.email, password: "incorrecta-123" });
      const emailInexistente = await request(app)
        .post("/api/auth/login")
        .send({ gimnasioSlug: "mi-gym", email: "nadie@mail.com", password: PASSWORD });
      const gimnasioInexistente = await request(app)
        .post("/api/auth/login")
        .send({ gimnasioSlug: "no-existe", email: usuario.email, password: PASSWORD });

      for (const res of [passwordIncorrecta, emailInexistente, gimnasioInexistente]) {
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Credenciales inválidas" });
      }
    });

    it("un usuario desactivado no puede iniciar sesión", async () => {
      const gimnasio = await crearGimnasio({ slug: "mi-gym" });
      const usuario = await crearUsuario(gimnasio.id, { activo: false });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ gimnasioSlug: "mi-gym", email: usuario.email, password: PASSWORD });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Credenciales inválidas");
    });

    it("un gimnasio desactivado no permite iniciar sesión", async () => {
      const gimnasio = await crearGimnasio({ slug: "mi-gym", activo: false });
      const usuario = await crearUsuario(gimnasio.id);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ gimnasioSlug: "mi-gym", email: usuario.email, password: PASSWORD });
      expect(res.status).toBe(401);
    });
  });

  it("el mismo email en dos gimnasios resuelve a la cuenta de cada uno", async () => {
    const gimnasioA = await crearGimnasio({ slug: "gym-a" });
    const gimnasioB = await crearGimnasio({ slug: "gym-b" });
    const enA = await crearUsuario(gimnasioA.id, { email: "compartido@mail.com", rol: "ADMIN" });
    const enB = await crearUsuario(gimnasioB.id, {
      email: "compartido@mail.com",
      password: "otra-clave-456",
    });

    const loginA = await request(app)
      .post("/api/auth/login")
      .send({ gimnasioSlug: "gym-a", email: "compartido@mail.com", password: PASSWORD });
    expect(loginA.status).toBe(200);
    expect(loginA.body.usuario.id).toBe(enA.id);

    // La contraseña de A no sirve en B
    const cruzado = await request(app)
      .post("/api/auth/login")
      .send({ gimnasioSlug: "gym-b", email: "compartido@mail.com", password: PASSWORD });
    expect(cruzado.status).toBe(401);

    const loginB = await request(app)
      .post("/api/auth/login")
      .send({ gimnasioSlug: "gym-b", email: "compartido@mail.com", password: "otra-clave-456" });
    expect(loginB.status).toBe(200);
    expect(loginB.body.usuario.id).toBe(enB.id);
    expect(loginB.body.gimnasio.id).toBe(gimnasioB.id);
  });

  it.each([
    ["body vacío", {}],
    ["sin contraseña", { gimnasioSlug: "mi-gym", email: "a@b.com" }],
    ["email inválido", { gimnasioSlug: "mi-gym", email: "no-es-email", password: "x" }],
  ])("rechaza con 400: %s", async (_caso, body) => {
    const res = await request(app).post("/api/auth/login").send(body);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me y validación del token", () => {
  it("devuelve el usuario y el gimnasio de la sesión", async () => {
    const { a } = await crearEscenario();

    const res = await request(app).get("/api/auth/me").set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body.usuario).toMatchObject({ id: a.admin.id, email: a.admin.email, rol: "ADMIN" });
    expect(res.body.gimnasio.id).toBe(a.gimnasio.id);
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  describe("tokens rechazados con 401", () => {
    it("sin el header Authorization", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Falta el token de autenticación");
    });

    it("con un esquema distinto de Bearer", async () => {
      const { a } = await crearEscenario();
      const res = await request(app).get("/api/auth/me").set("Authorization", `Basic ${a.token}`);
      expect(res.status).toBe(401);
    });

    it("con un token que no es un JWT", async () => {
      const res = await request(app).get("/api/auth/me").set(conToken("esto-no-es-un-jwt"));
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Token inválido o expirado");
    });

    it("vencido", async () => {
      const { a } = await crearEscenario();
      const vencido = jwt.sign({ gid: a.gimnasio.id, ver: 0 }, JWT_SECRET, {
        subject: a.admin.id,
        expiresIn: -10,
      });
      const res = await request(app).get("/api/auth/me").set(conToken(vencido));
      expect(res.status).toBe(401);
    });

    it("firmado con otro secreto", async () => {
      const { a } = await crearEscenario();
      const ajeno = jwt.sign({ gid: a.gimnasio.id, ver: 0 }, "otro-secreto-distinto", {
        subject: a.admin.id,
      });
      const res = await request(app).get("/api/auth/me").set(conToken(ajeno));
      expect(res.status).toBe(401);
    });

    it("con el algoritmo 'none' (sin firma)", async () => {
      const { a } = await crearEscenario();
      const sinFirma = jwt.sign({ gid: a.gimnasio.id, ver: 0 }, "", {
        algorithm: "none",
        subject: a.admin.id,
      });
      const res = await request(app).get("/api/auth/me").set(conToken(sinFirma));
      expect(res.status).toBe(401);
    });

    it("sin los datos que la API espera (sub, gid y ver)", async () => {
      const incompleto = jwt.sign({ cualquier: "cosa" }, JWT_SECRET);
      const res = await request(app).get("/api/auth/me").set(conToken(incompleto));
      expect(res.status).toBe(401);
    });

    it("de un usuario que declara pertenecer a OTRO gimnasio", async () => {
      const { a, b } = await crearEscenario();
      // Firmado con el secreto correcto, pero el gimnasio del token no es el del usuario
      const falsificado = jwt.sign({ gid: b.gimnasio.id, ver: 0 }, JWT_SECRET, {
        subject: a.admin.id,
      });
      const res = await request(app).get("/api/auth/me").set(conToken(falsificado));
      expect(res.status).toBe(401);
    });

    it("emitido antes de que existiera la versión del token (sin ver)", async () => {
      const { a } = await crearEscenario();
      const viejo = jwt.sign({ gid: a.gimnasio.id }, JWT_SECRET, { subject: a.admin.id });
      const res = await request(app).get("/api/auth/me").set(conToken(viejo));
      expect(res.status).toBe(401);
    });
  });

  describe("el estado se verifica en cada request", () => {
    it("un usuario desactivado pierde el acceso en el acto, aunque su token no venza", async () => {
      const { a } = await crearEscenario();
      const recepcion = await crearUsuario(a.gimnasio.id);
      const token = tokenDe(recepcion);

      expect((await request(app).get("/api/auth/me").set(conToken(token))).status).toBe(200);

      await prisma.usuario.update({ where: { id: recepcion.id }, data: { activo: false } });

      const res = await request(app).get("/api/auth/me").set(conToken(token));
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Usuario inactivo o inexistente");
    });

    it("si se desactiva el gimnasio, todos sus usuarios pierden el acceso", async () => {
      const { a } = await crearEscenario();
      await prisma.gimnasio.update({ where: { id: a.gimnasio.id }, data: { activo: false } });

      const res = await request(app).get("/api/auth/me").set(conToken(a.token));
      expect(res.status).toBe(401);
    });

    it("un usuario eliminado pierde el acceso", async () => {
      const { a } = await crearEscenario();
      const recepcion = await crearUsuario(a.gimnasio.id);
      const token = tokenDe(recepcion);
      await prisma.usuario.delete({ where: { id: recepcion.id } });

      const res = await request(app).get("/api/auth/me").set(conToken(token));
      expect(res.status).toBe(401);
    });

    it("un token con una versión anterior a la del usuario pierde el acceso", async () => {
      const { a } = await crearEscenario();
      const recepcion = await crearUsuario(a.gimnasio.id);
      const token = tokenDe(recepcion);

      await prisma.usuario.update({
        where: { id: recepcion.id },
        data: { tokenVersion: { increment: 1 } },
      });

      const res = await request(app).get("/api/auth/me").set(conToken(token));
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Usuario inactivo o inexistente");
    });

    it("un cambio de rol se refleja de inmediato", async () => {
      const { a } = await crearEscenario();
      const recepcion = await crearUsuario(a.gimnasio.id);
      const token = tokenDe(recepcion);

      const antes = await request(app).get("/api/auth/me").set(conToken(token));
      expect(antes.body.usuario.rol).toBe("RECEPCIONISTA");

      await prisma.usuario.update({ where: { id: recepcion.id }, data: { rol: "ADMIN" } });

      const despues = await request(app).get("/api/auth/me").set(conToken(token));
      expect(despues.body.usuario.rol).toBe("ADMIN");
    });
  });
});

describe("POST /api/auth/change-password", () => {
  const cambiar = (token: string, body: object) =>
    request(app).post("/api/auth/change-password").set(conToken(token)).send(body);

  it("cambia la contraseña: la nueva sirve para iniciar sesión y la vieja deja de servir", async () => {
    const { a } = await crearEscenario();
    const usuario = await crearUsuario(a.gimnasio.id);

    const res = await cambiar(tokenDe(usuario), {
      currentPassword: PASSWORD,
      newPassword: "contraseña-nueva-789",
    });
    expect(res.status).toBe(200);

    const login = (password: string) =>
      request(app)
        .post("/api/auth/login")
        .send({ gimnasioSlug: a.gimnasio.slug, email: usuario.email, password });

    expect((await login("contraseña-nueva-789")).status).toBe(200);
    expect((await login(PASSWORD)).status).toBe(401);
  });

  it("devuelve una sesión nueva y cierra todas las sesiones abiertas del usuario", async () => {
    const { a } = await crearEscenario();
    const usuario = await crearUsuario(a.gimnasio.id);
    const tokenActual = tokenDe(usuario);
    const otraSesion = tokenDe(usuario);
    const me = (token: string) => request(app).get("/api/auth/me").set(conToken(token));

    const res = await cambiar(tokenActual, {
      currentPassword: PASSWORD,
      newPassword: "contraseña-nueva-789",
    });

    expect(res.status).toBe(200);
    expect(res.body.usuario).toMatchObject({ id: usuario.id, email: usuario.email });
    expect(res.body.gimnasio).toEqual({
      id: a.gimnasio.id,
      nombre: a.gimnasio.nombre,
      slug: a.gimnasio.slug,
    });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");

    expect((await me(tokenActual)).status).toBe(401);
    expect((await me(otraSesion)).status).toBe(401);
    expect((await me(res.body.token)).status).toBe(200);

    const enBase = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(enBase.tokenVersion).toBe(usuario.tokenVersion + 1);
  });

  it("no cierra las sesiones de otros usuarios del gimnasio", async () => {
    const { a } = await crearEscenario();
    const usuario = await crearUsuario(a.gimnasio.id);

    await cambiar(tokenDe(usuario), { currentPassword: PASSWORD, newPassword: "nueva-123456" });

    expect((await request(app).get("/api/auth/me").set(conToken(a.token))).status).toBe(200);
  });

  it("si el cambio falla, la sesión sigue abierta y la versión no cambia", async () => {
    const { a } = await crearEscenario();

    const res = await cambiar(a.token, {
      currentPassword: "incorrecta",
      newPassword: "nueva-123456",
    });

    expect(res.status).toBe(400);
    expect((await request(app).get("/api/auth/me").set(conToken(a.token))).status).toBe(200);
    const enBase = await prisma.usuario.findUniqueOrThrow({ where: { id: a.admin.id } });
    expect(enBase.tokenVersion).toBe(a.admin.tokenVersion);
  });

  it("con la contraseña actual incorrecta responde 400 (no 401, para no cerrar la sesión)", async () => {
    const { a } = await crearEscenario();
    const res = await cambiar(a.token, {
      currentPassword: "incorrecta",
      newPassword: "nueva-123456",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("La contraseña actual es incorrecta");
  });

  it("rechaza una nueva contraseña igual a la actual", async () => {
    const { a } = await crearEscenario();
    const res = await cambiar(a.token, { currentPassword: PASSWORD, newPassword: PASSWORD });
    expect(res.status).toBe(400);
  });

  it("rechaza una nueva contraseña demasiado corta", async () => {
    const { a } = await crearEscenario();
    const res = await cambiar(a.token, { currentPassword: PASSWORD, newPassword: "corta" });
    expect(res.status).toBe(400);
  });

  it("exige sesión", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .send({ currentPassword: PASSWORD, newPassword: "nueva-123456" });
    expect(res.status).toBe(401);
  });

  it("solo cambia la contraseña del usuario de la sesión", async () => {
    const { a, b } = await crearEscenario();
    await cambiar(a.token, { currentPassword: PASSWORD, newPassword: "nueva-123456" });

    const deB = await prisma.usuario.findUniqueOrThrow({ where: { id: b.admin.id } });
    expect(await comparePassword(PASSWORD, deB.passwordHash)).toBe(true);
    expect(deB.tokenVersion).toBe(b.admin.tokenVersion);
  });
});

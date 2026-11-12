import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { env } from "../../src/config/env";
import { prisma } from "../../src/config/database";
import { REGISTRO_DESHABILITADO } from "../../src/middlewares/registro.middleware";
import { crearGimnasio } from "../helpers/factories";

const app = createApp();
const valorOriginal = env.REGISTRO_GIMNASIOS_HABILITADO;

// El interruptor se lee en cada request, así que alcanza con cambiar el valor ya validado
function conRegistro(habilitado: boolean) {
  env.REGISTRO_GIMNASIOS_HABILITADO = habilitado;
}

afterEach(() => {
  env.REGISTRO_GIMNASIOS_HABILITADO = valorOriginal;
});

const registroValido = {
  gimnasio: { nombre: "Gimnasio Nuevo", slug: "gimnasio-nuevo" },
  admin: {
    email: "admin@nuevo.com",
    password: "clave-segura-123",
    nombre: "Ana",
    apellido: "Pérez",
  },
};

describe("GET /api/auth/config", () => {
  it("informa sin sesión si el registro de gimnasios está habilitado", async () => {
    conRegistro(true);
    const res = await request(app).get("/api/auth/config");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ registroGimnasiosHabilitado: true });
  });

  it("informa si el registro de gimnasios está deshabilitado", async () => {
    conRegistro(false);
    const res = await request(app).get("/api/auth/config");
    expect(res.body).toEqual({ registroGimnasiosHabilitado: false });
  });
});

describe("POST /api/auth/register-gimnasio con el registro deshabilitado", () => {
  it("responde 403 y no crea el gimnasio ni el usuario", async () => {
    conRegistro(false);

    const res = await request(app).post("/api/auth/register-gimnasio").send(registroValido);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe(REGISTRO_DESHABILITADO);
    expect(await prisma.gimnasio.count()).toBe(0);
    expect(await prisma.usuario.count()).toBe(0);
  });

  it("responde 403 antes de validar el body", async () => {
    conRegistro(false);
    const res = await request(app).post("/api/auth/register-gimnasio").send({});
    expect(res.status).toBe(403);
  });

  it("no afecta el login de los gimnasios existentes", async () => {
    const gimnasio = await crearGimnasio();
    conRegistro(false);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ gimnasioSlug: gimnasio.slug, email: "nadie@test.com", password: "x" });

    expect(res.status).toBe(401); // credenciales inválidas, no 403
  });

  it("al volver a habilitarlo, el registro funciona", async () => {
    conRegistro(false);
    expect(
      (await request(app).post("/api/auth/register-gimnasio").send(registroValido)).status
    ).toBe(403);

    conRegistro(true);
    const res = await request(app).post("/api/auth/register-gimnasio").send(registroValido);
    expect(res.status).toBe(201);
    expect(await prisma.gimnasio.count()).toBe(1);
  });
});

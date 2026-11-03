import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app";
import * as password from "../../src/utils/password";
import { crearGimnasio, crearUsuario, PASSWORD } from "../helpers/factories";

// Se envuelve comparePassword para poder observar con qué hash se la llama
vi.mock("../../src/utils/password", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/utils/password")>();
  return { ...original, comparePassword: vi.fn(original.comparePassword) };
});

const app = createApp();
const comparePassword = vi.mocked(password.comparePassword);

const ES_UN_HASH_BCRYPT = /^\$2[aby]\$\d{2}\$.{53}$/;

describe("login: tiempo de respuesta constante", () => {
  beforeEach(() => {
    comparePassword.mockClear();
  });

  // Si el usuario no existe y no se hiciera ninguna comparación, la respuesta sería mucho
  // más rápida y delataría qué emails están registrados. Un test de tiempos sería frágil:
  // se comprueba, en cambio, que bcrypt se ejecuta igual contra un hash válido.
  it("compara contra un hash ficticio cuando el email no existe", async () => {
    const gimnasio = await crearGimnasio({ slug: "mi-gym" });
    await crearUsuario(gimnasio.id);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ gimnasioSlug: "mi-gym", email: "nadie@mail.com", password: PASSWORD });

    expect(res.status).toBe(401);
    expect(comparePassword).toHaveBeenCalledTimes(1);
    expect(comparePassword.mock.calls[0][1]).toMatch(ES_UN_HASH_BCRYPT);
  });

  it("compara contra un hash ficticio cuando el gimnasio no existe", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ gimnasioSlug: "no-existe", email: "a@b.com", password: PASSWORD });

    expect(res.status).toBe(401);
    expect(comparePassword).toHaveBeenCalledTimes(1);
    expect(comparePassword.mock.calls[0][1]).toMatch(ES_UN_HASH_BCRYPT);
  });

  it("compara contra el hash real cuando el usuario existe", async () => {
    const gimnasio = await crearGimnasio({ slug: "mi-gym" });
    const usuario = await crearUsuario(gimnasio.id);

    await request(app)
      .post("/api/auth/login")
      .send({ gimnasioSlug: "mi-gym", email: usuario.email, password: "incorrecta-123" });

    expect(comparePassword).toHaveBeenCalledTimes(1);
    expect(comparePassword.mock.calls[0][1]).toBe(usuario.passwordHash);
  });
});

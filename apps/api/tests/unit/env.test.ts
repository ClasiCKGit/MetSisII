import { describe, expect, it } from "vitest";
import { envSchema, origenesPermitidos } from "../../src/config/env";

const base = {
  DATABASE_URL: "postgresql://localhost/x",
  JWT_SECRET: "secreto-de-prueba",
  RESEND_API_KEY: "re_test_dummy",
  MAIL_FROM: "FitManager <onboarding@resend.dev>",
};

describe("REGISTRO_GIMNASIOS_HABILITADO", () => {
  it("está habilitado si no se define", () => {
    expect(envSchema.parse(base).REGISTRO_GIMNASIOS_HABILITADO).toBe(true);
  });

  it.each([
    ["false", false],
    ["0", false],
    ["true", true],
    ["1", true],
  ])("interpreta %s como %s", (valor, esperado) => {
    const env = envSchema.parse({ ...base, REGISTRO_GIMNASIOS_HABILITADO: valor });
    expect(env.REGISTRO_GIMNASIOS_HABILITADO).toBe(esperado);
  });

  it("rechaza un valor que no es booleano, en lugar de tomarlo como habilitado", () => {
    const resultado = envSchema.safeParse({ ...base, REGISTRO_GIMNASIOS_HABILITADO: "talvez" });
    expect(resultado.success).toBe(false);
  });
});

describe("TRUST_PROXY", () => {
  it("es 0 si no se define (no confía en ningún proxy)", () => {
    expect(envSchema.parse(base).TRUST_PROXY).toBe(0);
  });

  it("acepta la cantidad de proxies como texto", () => {
    expect(envSchema.parse({ ...base, TRUST_PROXY: "1" }).TRUST_PROXY).toBe(1);
  });

  it.each(["-1", "1.5", "true", "abc"])("rechaza %s", (valor) => {
    expect(envSchema.safeParse({ ...base, TRUST_PROXY: valor }).success).toBe(false);
  });
});

describe("CORS_ORIGINS", () => {
  it("si no se define, solo permite el origen de FRONTEND_URL", () => {
    const env = envSchema.parse({ ...base, FRONTEND_URL: "https://app.fitmanager.com/login" });
    expect(origenesPermitidos(env)).toEqual(["https://app.fitmanager.com"]);
  });

  it("separa la lista por comas, sin espacios ni barras finales", () => {
    const env = envSchema.parse({
      ...base,
      CORS_ORIGINS: "https://fitmanager.com/ , https://www.fitmanager.com",
    });
    expect(origenesPermitidos(env)).toEqual([
      "https://fitmanager.com",
      "https://www.fitmanager.com",
    ]);
  });

  it.each(["fitmanager.com", "https://fitmanager.com/login", "*"])("rechaza %s", (valor) => {
    expect(envSchema.safeParse({ ...base, CORS_ORIGINS: valor }).success).toBe(false);
  });

  it("rechaza un FRONTEND_URL que no es una URL", () => {
    expect(envSchema.safeParse({ ...base, FRONTEND_URL: "localhost" }).success).toBe(false);
  });
});

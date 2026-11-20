import { describe, expect, it } from "vitest";
import { envSchema } from "../../src/config/env";

const base = { DATABASE_URL: "postgresql://localhost/x", JWT_SECRET: "secreto-de-prueba" };

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

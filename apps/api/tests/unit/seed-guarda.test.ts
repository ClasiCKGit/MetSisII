import { describe, expect, it } from "vitest";
import { asegurarEntornoNoProductivo } from "../../prisma/seed/guarda";

describe("guarda de entorno del seed", () => {
  it("se niega a correr con NODE_ENV=production", () => {
    expect(() => asegurarEntornoNoProductivo("production")).toThrow(/NODE_ENV=production/);
  });

  it("deja correr en desarrollo, en test y sin NODE_ENV", () => {
    expect(() => asegurarEntornoNoProductivo("development")).not.toThrow();
    expect(() => asegurarEntornoNoProductivo("test")).not.toThrow();
    expect(() => asegurarEntornoNoProductivo(undefined)).not.toThrow();
  });
});

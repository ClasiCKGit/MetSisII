import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slugify";

describe("slugify", () => {
  it.each([
    ["Gimnasio Ñandú Bahía", "gimnasio-nandu-bahia"],
    ["  FitZone  ", "fitzone"],
    ["Gym & Fitness (Centro)", "gym-fitness-centro"],
    ["---Hola---mundo---", "hola-mundo"],
    ["Ñoño", "nono"],
    ["", ""],
    ["!!!", ""],
  ])("%j -> %j", (entrada, esperado) => {
    expect(slugify(entrada)).toBe(esperado);
  });

  it("no pasa de 40 caracteres ni termina en guion", () => {
    const resultado = slugify("a".repeat(39) + " b" + " c".repeat(5));
    expect(resultado.length).toBeLessThanOrEqual(40);
    expect(resultado.endsWith("-")).toBe(false);
  });
});

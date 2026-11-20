import { describe, expect, it } from "vitest";
import { estadoVigencia } from "../../src/modules/membresias/vigencia";

const HOY = new Date("2026-11-20T15:00:00.000Z");

function fechaUtc(diasDesdeHoy: number) {
  return new Date(Date.UTC(2026, 10, 20 + diasDesdeHoy, 12));
}

describe("estadoVigencia", () => {
  it("marca como vencida una membresía cuya fecha de fin ya pasó", () => {
    expect(estadoVigencia(fechaUtc(-1), "ACTIVA", HOY)).toBe("VENCIDA");
  });

  it("incluye hoy y los próximos siete días en por vencer", () => {
    expect(estadoVigencia(fechaUtc(0), "ACTIVA", HOY)).toBe("POR_VENCER");
    expect(estadoVigencia(fechaUtc(7), "ACTIVA", HOY)).toBe("POR_VENCER");
  });

  it("marca al día una membresía que vence después de los próximos siete días", () => {
    expect(estadoVigencia(fechaUtc(8), "ACTIVA", HOY)).toBe("AL_DIA");
  });

  it("no asigna vigencia a una membresía cancelada", () => {
    expect(estadoVigencia(fechaUtc(30), "CANCELADA", HOY)).toBeNull();
  });
});

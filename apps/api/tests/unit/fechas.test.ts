import { describe, expect, it } from "vitest";
import { esZonaHorariaValida, medianocheEnZona, rangoDelMes } from "../../src/utils/fechas";
import { estadoVigencia, rangoPorVencer } from "../../src/modules/membresias/vigencia";

const ARGENTINA = "America/Argentina/Buenos_Aires";

describe("medianocheEnZona", () => {
  it("devuelve el inicio del día en la zona (Argentina es UTC-3)", () => {
    expect(medianocheEnZona(2026, 11, 1, ARGENTINA).toISOString()).toBe("2026-11-01T03:00:00.000Z");
  });

  it("en UTC coincide con la medianoche UTC", () => {
    expect(medianocheEnZona(2026, 3, 15, "UTC").toISOString()).toBe("2026-03-15T00:00:00.000Z");
  });

  it("respeta el horario de verano de otras zonas", () => {
    // Madrid: UTC+1 en invierno, UTC+2 en verano
    expect(medianocheEnZona(2026, 1, 10, "Europe/Madrid").toISOString()).toBe(
      "2026-01-09T23:00:00.000Z"
    );
    expect(medianocheEnZona(2026, 7, 10, "Europe/Madrid").toISOString()).toBe(
      "2026-07-09T22:00:00.000Z"
    );
  });
});

describe("rangoDelMes", () => {
  it("usa el mes de la zona aunque en UTC ya sea el mes siguiente", () => {
    // 31 de octubre a las 23:00 en Argentina
    const { desde, hasta } = rangoDelMes(new Date("2026-11-01T02:00:00.000Z"), ARGENTINA);

    expect(desde.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(hasta.toISOString()).toBe("2026-11-01T03:00:00.000Z");
  });

  it("en diciembre termina el 1 de enero del año siguiente", () => {
    const { desde, hasta } = rangoDelMes(new Date("2026-12-15T12:00:00.000Z"), ARGENTINA);

    expect(desde.toISOString()).toBe("2026-12-01T03:00:00.000Z");
    expect(hasta.toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });
});

describe("esZonaHorariaValida", () => {
  it("acepta zonas IANA y rechaza cualquier otra cosa", () => {
    expect(esZonaHorariaValida(ARGENTINA)).toBe(true);
    expect(esZonaHorariaValida("Marte/Olympus")).toBe(false);
  });
});

describe("rangoPorVencer", () => {
  const AHORA = new Date("2026-11-20T15:00:00.000Z");

  it("va del inicio del día UTC de hoy al inicio del día dentro de ocho días", () => {
    const { desde, hasta } = rangoPorVencer(AHORA);

    expect(desde.toISOString()).toBe("2026-11-20T00:00:00.000Z");
    expect(hasta.toISOString()).toBe("2026-11-28T00:00:00.000Z");
  });

  it("coincide con estadoVigencia en los bordes", () => {
    const { desde, hasta } = rangoPorVencer(AHORA);
    const antes = new Date(desde.getTime() - 1);
    const ultimo = new Date(hasta.getTime() - 1);

    expect(estadoVigencia(antes, "ACTIVA", AHORA)).toBe("VENCIDA");
    expect(estadoVigencia(desde, "ACTIVA", AHORA)).toBe("POR_VENCER");
    expect(estadoVigencia(ultimo, "ACTIVA", AHORA)).toBe("POR_VENCER");
    expect(estadoVigencia(hasta, "ACTIVA", AHORA)).toBe("AL_DIA");
  });
});

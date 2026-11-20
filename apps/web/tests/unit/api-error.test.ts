import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { describe, expect, it } from "vitest";
import { ApiError, getErrorMessage, hasStatus, toApiError } from "@/lib/api-error";

const config = { headers: {} } as InternalAxiosRequestConfig;

function errorDeAxios(status: number, data: unknown) {
  return new AxiosError("falló", "ERR_BAD_REQUEST", config, null, {
    status,
    statusText: "",
    data,
    headers: {},
    config,
  });
}

describe("toApiError", () => {
  it("toma el mensaje del campo error de la API", () => {
    const e = toApiError(errorDeAxios(409, { error: "Ya existe" }));
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(409);
    expect(e.message).toBe("Ya existe");
  });

  it("conserva los details de un error de validación", () => {
    const e = toApiError(
      errorDeAxios(400, { error: "Error de validación", details: { errors: ["x"] } })
    );
    expect(e.details).toEqual({ errors: ["x"] });
  });

  it("usa un mensaje genérico si la respuesta no tiene la forma esperada", () => {
    expect(toApiError(errorDeAxios(500, "<html>caído</html>")).message).toBe(
      "Ocurrió un error inesperado"
    );
    expect(toApiError(errorDeAxios(500, { error: 42 })).message).toBe(
      "Ocurrió un error inesperado"
    );
    expect(toApiError(errorDeAxios(500, null)).message).toBe("Ocurrió un error inesperado");
  });

  it("si no hubo respuesta (servidor caído) el status es null", () => {
    const e = toApiError(new AxiosError("Network Error", "ERR_NETWORK", config, {}));
    expect(e.status).toBeNull();
    expect(e.message).toBe("No se pudo conectar con el servidor");
  });

  it("un error que no es de axios da un mensaje genérico", () => {
    const e = toApiError(new Error("algo"));
    expect(e.status).toBeNull();
    expect(e.message).toBe("Ocurrió un error inesperado");
  });

  it("un ApiError se devuelve tal cual", () => {
    const original = new ApiError(404, "No está");
    expect(toApiError(original)).toBe(original);
  });
});

describe("getErrorMessage y hasStatus", () => {
  it("getErrorMessage devuelve siempre un texto", () => {
    expect(getErrorMessage(errorDeAxios(401, { error: "Credenciales inválidas" }))).toBe(
      "Credenciales inválidas"
    );
    expect(getErrorMessage("cualquier cosa")).toBe("Ocurrió un error inesperado");
  });

  it("hasStatus compara el código solo en errores de la API", () => {
    expect(hasStatus(new ApiError(409, "x"), 409)).toBe(true);
    expect(hasStatus(new ApiError(409, "x"), 404)).toBe(false);
    expect(hasStatus(new Error("x"), 409)).toBe(false);
    expect(hasStatus(null, 409)).toBe(false);
  });
});

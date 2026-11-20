import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-error";
import { queryClient } from "@/lib/query-client";

// La política de reintentos de las consultas: los errores del cliente (4xx) no se reintentan
// porque no se arreglan solos; los del servidor y los de red se reintentan hasta 2 veces.
const retry = queryClient.getDefaultOptions().queries?.retry as (
  failureCount: number,
  error: Error
) => boolean;

describe("política de reintentos de TanStack Query", () => {
  it.each([400, 401, 403, 404, 409])("no reintenta un error %i (del cliente)", (status) => {
    expect(retry(0, new ApiError(status, "x"))).toBe(false);
  });

  it.each([500, 502, 503])("reintenta un error %i (del servidor) hasta 2 veces", (status) => {
    const error = new ApiError(status, "x");
    expect(retry(0, error)).toBe(true);
    expect(retry(1, error)).toBe(true);
    expect(retry(2, error)).toBe(false);
  });

  it("reintenta un error de red (sin respuesta) hasta 2 veces", () => {
    const error = new ApiError(null, "No se pudo conectar con el servidor");
    expect(retry(0, error)).toBe(true);
    expect(retry(2, error)).toBe(false);
  });

  it("no refresca al volver a enfocar la ventana", () => {
    expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });
});

import axios from "axios";

// Error que ve el resto de la app: ya no se manejan errores crudos de axios.
// Se declaran los campos de forma explícita (y no como "parameter properties")
// porque el tsconfig de Vite activa erasableSyntaxOnly.
export class ApiError extends Error {
  readonly status: number | null;
  readonly details: unknown;

  constructor(status: number | null, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// La API siempre responde los errores con la forma { error: string, details?: ... }
function mensajeDe(data: unknown): string | undefined {
  if (typeof data === "object" && data !== null && "error" in data) {
    const { error } = data as { error: unknown };
    if (typeof error === "string") return error;
  }
  return undefined;
}

function detallesDe(data: unknown): unknown {
  if (typeof data === "object" && data !== null && "details" in data) {
    return (data as { details: unknown }).details;
  }
  return undefined;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    // Sin respuesta: el servidor no está accesible (caído, sin red, CORS...)
    if (!error.response) {
      return new ApiError(null, "No se pudo conectar con el servidor");
    }
    const { status, data } = error.response;
    return new ApiError(status, mensajeDe(data) ?? "Ocurrió un error inesperado", detallesDe(data));
  }

  return new ApiError(null, "Ocurrió un error inesperado");
}

export function getErrorMessage(error: unknown): string {
  return toApiError(error).message;
}

// ¿El error vino de la API con ese código HTTP? (por ejemplo 409: el recurso ya existe)
export function hasStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status;
}

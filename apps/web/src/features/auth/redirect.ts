// Después de iniciar sesión se vuelve a la página que el usuario quería abrir
// (RequireAuth la guarda en el estado del router). Solo se aceptan rutas internas:
// "//sitio.com" sería una redirección a otro sitio.
export function getRedirectPath(state: unknown): string {
  if (typeof state === "object" && state !== null && "from" in state) {
    const from = (state as { from?: { pathname?: unknown; search?: unknown } }).from;
    if (
      from &&
      typeof from.pathname === "string" &&
      from.pathname.startsWith("/") &&
      !from.pathname.startsWith("//") &&
      from.pathname !== "/login"
    ) {
      return from.pathname + (typeof from.search === "string" ? from.search : "");
    }
  }
  return "/";
}

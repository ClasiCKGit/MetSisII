import { describe, expect, it } from "vitest";
import { getRedirectPath } from "@/features/auth/redirect";

const desde = (pathname: unknown, search?: unknown) => ({ from: { pathname, search } });

describe("getRedirectPath", () => {
  it("vuelve a la página pedida, con su query", () => {
    expect(getRedirectPath(desde("/usuarios"))).toBe("/usuarios");
    expect(getRedirectPath(desde("/socios", "?pagina=2"))).toBe("/socios?pagina=2");
  });

  it.each([
    ["una URL absoluta", desde("https://sitio-malicioso.com")],
    ["una ruta que empieza con //", desde("//sitio-malicioso.com")],
    ["la propia pantalla de login", desde("/login")],
    ["un pathname que no es texto", desde(42)],
    ["un estado sin from", {}],
    ["null", null],
    ["undefined", undefined],
    ["un string", "/usuarios"],
  ])("ante %s vuelve al inicio", (_caso, estado) => {
    expect(getRedirectPath(estado)).toBe("/");
  });
});

import { describe, expect, it } from "vitest";
import { getAuthStatus, useAuthStore } from "@/store/auth.store";

const sesion = {
  token: "tok",
  usuario: { id: "u1", email: "a@b.com", nombre: "Ana", apellido: "Pérez", rol: "ADMIN" as const },
  gimnasio: { id: "g1", nombre: "Gym", slug: "gym-norte" },
};

describe("getAuthStatus", () => {
  it.each([
    [{ token: null, usuario: null }, "unauthenticated"],
    [{ token: null, usuario: sesion.usuario }, "unauthenticated"],
    [{ token: "tok", usuario: null }, "checking"],
    [{ token: "tok", usuario: sesion.usuario }, "authenticated"],
  ] as const)("%j -> %s", (estado, esperado) => {
    expect(getAuthStatus(estado)).toBe(esperado);
  });
});

describe("useAuthStore", () => {
  it("setSession guarda la sesión y recuerda el gimnasio", () => {
    useAuthStore.getState().setSession(sesion);
    const estado = useAuthStore.getState();
    expect(estado.token).toBe("tok");
    expect(estado.usuario?.nombre).toBe("Ana");
    expect(estado.ultimoSlug).toBe("gym-norte");
  });

  it("solo persiste el token y el último gimnasio, nunca el usuario", () => {
    useAuthStore.getState().setSession(sesion);

    const guardado = JSON.parse(localStorage.getItem("fitmanager-auth") ?? "{}");
    expect(Object.keys(guardado.state).sort()).toEqual(["token", "ultimoSlug"]);
    expect(localStorage.getItem("fitmanager-auth")).not.toContain("a@b.com");
  });

  it("setProfile completa el usuario sin tocar el token", () => {
    useAuthStore.setState({ token: "tok" });
    useAuthStore.getState().setProfile({ usuario: sesion.usuario, gimnasio: sesion.gimnasio });
    expect(useAuthStore.getState().token).toBe("tok");
    expect(getAuthStatus(useAuthStore.getState())).toBe("authenticated");
  });

  it("logout borra la sesión pero conserva el último gimnasio", () => {
    useAuthStore.getState().setSession(sesion);
    useAuthStore.getState().logout();

    const { token, usuario, gimnasio, ultimoSlug } = useAuthStore.getState();
    expect([token, usuario, gimnasio]).toEqual([null, null, null]);
    expect(ultimoSlug).toBe("gym-norte");
  });
});

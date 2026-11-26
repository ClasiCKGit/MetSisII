import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/store/auth.store";
import { conSesion, nuevoGimnasio } from "../helpers/api";
import { renderApp } from "../helpers/render";

// Estos dos tests comprueban la propia suite: que el estado global (avisos y sesión) no se filtre de
// un test al siguiente. El segundo depende de que el primero corra antes (Vitest los ejecuta en orden).
describe("aislamiento entre tests", () => {
  it("1) deja un aviso en pantalla y una sesión abierta", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    renderApp("/");
    await screen.findByText("Hola, Ana");

    toast.add({ type: "success", title: "Aviso que no debe filtrarse" });

    expect(await screen.findByText("Aviso que no debe filtrarse")).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBe(g.token);
  });

  it("2) empieza sin el aviso ni la sesión del test anterior", async () => {
    renderApp("/login");

    expect(await screen.findByText("Ingresá a FitManager")).toBeInTheDocument();
    expect(screen.queryByText("Aviso que no debe filtrarse")).not.toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
    // persist guarda un estado vacío, nunca el token del test anterior
    expect(
      JSON.parse(localStorage.getItem("fitmanager-auth") ?? "{}").state?.token ?? null
    ).toBeNull();
  });
});

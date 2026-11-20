import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth.store";
import { apiLoginStatus, apiMeStatus, conSesion, nuevoGimnasio } from "../helpers/api";
import { renderApp, type Usuario } from "../helpers/render";
import { esperarQueSeCierreElDialogo } from "../helpers/dialogo";

async function abrirDialogo(user: Usuario) {
  await user.click(await screen.findByRole("button", { name: "Cambiar contraseña" }));
  // Se filtra por nombre: los avisos (toast) también tienen role="dialog"
  return await screen.findByRole("dialog", { name: "Cambiar contraseña" });
}

describe("cambio de contraseña propia", () => {
  it("con la contraseña actual incorrecta muestra el error en el diálogo y NO cierra la sesión", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/");

    const dialogo = await abrirDialogo(user);
    await user.type(within(dialogo).getByLabelText("Contraseña actual"), "incorrecta-123");
    await user.type(within(dialogo).getByLabelText("Contraseña nueva"), "nueva-clave-123");
    await user.type(within(dialogo).getByLabelText("Repetir contraseña nueva"), "nueva-clave-123");
    await user.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    expect(
      await within(dialogo).findByText("La contraseña actual es incorrecta")
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Cambiar contraseña" })).toBeInTheDocument(); // sigue abierto
    expect(useAuthStore.getState().token).toBe(g.token); // y la sesión también
  });

  it("valida en el cliente: confirmación distinta y nueva igual a la actual", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/");

    const dialogo = await abrirDialogo(user);
    await user.type(within(dialogo).getByLabelText("Contraseña actual"), g.password);
    await user.type(within(dialogo).getByLabelText("Contraseña nueva"), "nueva-clave-123");
    await user.type(within(dialogo).getByLabelText("Repetir contraseña nueva"), "no-coincide");
    await user.click(within(dialogo).getByRole("button", { name: "Guardar" }));
    expect(await within(dialogo).findByText("Las contraseñas no coinciden")).toBeInTheDocument();

    const nueva = within(dialogo).getByLabelText("Contraseña nueva");
    await user.clear(nueva);
    await user.type(nueva, g.password);
    const repetir = within(dialogo).getByLabelText("Repetir contraseña nueva");
    await user.clear(repetir);
    await user.type(repetir, g.password);
    await user.click(within(dialogo).getByRole("button", { name: "Guardar" }));
    expect(
      await within(dialogo).findByText("La nueva contraseña tiene que ser distinta de la actual")
    ).toBeInTheDocument();
  });

  it("cambia la contraseña: cierra el diálogo, avisa, y la nueva funciona en la API", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/");

    const dialogo = await abrirDialogo(user);
    await user.type(within(dialogo).getByLabelText("Contraseña actual"), g.password);
    await user.type(within(dialogo).getByLabelText("Contraseña nueva"), "nueva-clave-123");
    await user.type(within(dialogo).getByLabelText("Repetir contraseña nueva"), "nueva-clave-123");
    await user.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Contraseña actualizada")).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();
    expect(await apiLoginStatus(g.slug, g.email, "nueva-clave-123")).toBe(200);
    expect(await apiLoginStatus(g.slug, g.email, g.password)).toBe(401);

    // El token viejo quedó invalidado y la sesión sigue abierta con el nuevo
    const tokenNuevo = useAuthStore.getState().token;
    expect(tokenNuevo).not.toBe(g.token);
    expect(await apiMeStatus(g.token)).toBe(401);
    expect(await apiMeStatus(tokenNuevo as string)).toBe(200);
    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeInTheDocument();

    // Al volver a abrirlo, el formulario está vacío (no quedan los datos anteriores)
    const otraVez = await abrirDialogo(user);
    expect(within(otraVez).getByLabelText("Contraseña actual")).toHaveValue("");
  });
});

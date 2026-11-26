import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiCrearUsuario, apiLoginToken, conSesion, nuevoGimnasio } from "../helpers/api";
import { renderApp } from "../helpers/render";

const API = `${import.meta.env.VITE_API_URL}/api`;

async function apiObtenerGimnasio(token: string) {
  const res = await fetch(`${API}/gimnasio`, { headers: { Authorization: `Bearer ${token}` } });
  return (await res.json()) as Record<string, unknown>;
}

describe("datos del gimnasio", () => {
  it("el administrador llega desde el menú y ve el identificador, que no se puede cambiar", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user, router } = renderApp("/");

    await user.click(
      within(await screen.findByRole("navigation", { name: "Principal" })).getByRole("link", {
        name: "Gimnasio",
      })
    );

    expect(await screen.findByRole("heading", { name: "Datos del gimnasio" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/gimnasio");
    expect(await screen.findByText(g.slug)).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue(g.nombre);
    expect(screen.queryByLabelText(/identificador/i)).toBeNull();
  });

  it("guarda los cambios y el nombre nuevo aparece en el menú lateral sin recargar", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/gimnasio");

    const nombre = await screen.findByLabelText("Nombre");
    await user.clear(nombre);
    await user.type(nombre, "FitZone Centro");
    await user.type(screen.getByLabelText("Email de contacto"), "hola@fitzone.com");
    await user.type(screen.getByLabelText("Dirección"), "Alsina 100");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Datos del gimnasio actualizados")).toBeInTheDocument();
    expect(await screen.findByText("FitZone Centro", { selector: "span" })).toBeInTheDocument();
    expect(await apiObtenerGimnasio(g.token)).toMatchObject({
      nombre: "FitZone Centro",
      email: "hola@fitzone.com",
      telefono: null,
      direccion: "Alsina 100",
      slug: g.slug,
    });
  });

  it("valida en el cliente el nombre y el email, sin llamar a la API", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/gimnasio");

    const nombre = await screen.findByLabelText("Nombre");
    await user.clear(nombre);
    await user.type(nombre, "A");
    await user.type(screen.getByLabelText("Email de contacto"), "no-es-un-email");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("El nombre debe tener al menos 2 caracteres")
    ).toBeInTheDocument();
    expect(screen.getByText("El email no es válido")).toBeInTheDocument();
    expect((await apiObtenerGimnasio(g.token)).nombre).toBe(g.nombre);
  });

  it("la recepción no ve la opción en el menú y la ruta le muestra el aviso de permisos", async () => {
    const g = await nuevoGimnasio();
    const email = `carla-${crypto.randomUUID()}@test.com`;
    const carla = await apiCrearUsuario(g.token, { nombre: "Carla", apellido: "Recepción", email });
    await conSesion(await apiLoginToken(g.slug, email, carla.password));
    renderApp("/gimnasio");

    const menu = await screen.findByRole("navigation", { name: "Principal" });
    expect(within(menu).queryByRole("link", { name: "Gimnasio" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Datos del gimnasio" })).toBeNull();
    expect(await screen.findByText(/permiso/i)).toBeInTheDocument();
  });
});

import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  apiCrearUsuario,
  apiLoginStatus,
  apiLoginToken,
  apiMeStatus,
  conSesion,
  nuevoGimnasio,
  type GimnasioDePrueba,
} from "../helpers/api";
import { esperarQueSeCierreElDialogo } from "../helpers/dialogo";
import { renderApp } from "../helpers/render";

// hidden: true porque, mientras hay un diálogo abierto, el resto de la página queda inerte
// (oculto para los lectores de pantalla). Los findBy* esperan a que sea accesible.
const tabla = () => screen.getByRole("table", { hidden: true });
const fila = (nombre: string | RegExp) => within(tabla()).getByRole("row", { name: nombre });

async function conCarla(g: GimnasioDePrueba) {
  return apiCrearUsuario(g.token, {
    nombre: "Carla",
    apellido: "Recepción",
    email: `carla@${g.slug}.com`,
  });
}

describe("gestión de usuarios", () => {
  it("lista los usuarios; sobre uno mismo no hay desactivar ni restablecer contraseña", async () => {
    const g = await nuevoGimnasio();
    await conCarla(g);
    await conSesion(g.token);
    renderApp("/usuarios");

    expect(await screen.findByText("Carla Recepción")).toBeInTheDocument();

    const propia = fila(/Ana Admin/);
    expect(within(propia).getByText("Vos")).toBeInTheDocument();
    expect(within(propia).getByRole("button", { name: /Editar/ })).toBeInTheDocument();
    expect(within(propia).queryByRole("button", { name: /Desactivar/ })).not.toBeInTheDocument();
    expect(within(propia).queryByRole("button", { name: /Restablecer/ })).not.toBeInTheDocument();

    const ajena = fila(/Carla Recepción/);
    expect(within(ajena).getByText("Recepcionista")).toBeInTheDocument();
    expect(within(ajena).getByRole("button", { name: /Desactivar/ })).toBeInTheDocument();
  });

  it("muestra solo los usuarios del propio gimnasio", async () => {
    const g = await nuevoGimnasio();
    const otro = await nuevoGimnasio();
    await apiCrearUsuario(otro.token, {
      nombre: "Ajeno",
      apellido: "Otro",
      email: `ajeno@${otro.slug}.com`,
    });
    await conSesion(g.token);
    renderApp("/usuarios");

    await screen.findByText("Ana Admin");
    expect(screen.queryByText("Ajeno Otro")).not.toBeInTheDocument();
  });

  it("crea un usuario desde el diálogo: aparece en la tabla, avisa, y la persona puede ingresar", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/usuarios");

    await user.click(await screen.findByRole("button", { name: "Nuevo usuario" }));
    const dialogo = await screen.findByRole("dialog");
    await user.type(within(dialogo).getByLabelText("Nombre"), "Dani");
    await user.type(within(dialogo).getByLabelText("Apellido"), "Gómez");
    await user.type(within(dialogo).getByLabelText("Email"), `dani@${g.slug}.com`);
    await user.type(within(dialogo).getByLabelText("Contraseña inicial"), "dani-clave-123");
    await user.click(within(dialogo).getByRole("button", { name: "Crear usuario" }));

    expect(await screen.findByText("Usuario creado")).toBeInTheDocument();
    expect(await within(tabla()).findByText("Dani Gómez")).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();
    expect(await apiLoginStatus(g.slug, `dani@${g.slug}.com`, "dani-clave-123")).toBe(200);
  });

  it("el rol por defecto es Recepcionista y se puede crear un administrador", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/usuarios");

    await user.click(await screen.findByRole("button", { name: "Nuevo usuario" }));
    const dialogo = await screen.findByRole("dialog");
    const rol = within(dialogo).getByLabelText("Rol");
    expect(rol).toHaveValue("RECEPCIONISTA");

    await user.type(within(dialogo).getByLabelText("Nombre"), "Beto");
    await user.type(within(dialogo).getByLabelText("Apellido"), "Jefe");
    await user.type(within(dialogo).getByLabelText("Email"), `beto@${g.slug}.com`);
    await user.type(within(dialogo).getByLabelText("Contraseña inicial"), "beto-clave-123");
    await user.selectOptions(rol, "ADMIN");
    await user.click(within(dialogo).getByRole("button", { name: "Crear usuario" }));

    const nueva = await within(tabla()).findByRole("row", { name: /Beto Jefe/ });
    expect(within(nueva).getByText("Administrador")).toBeInTheDocument();
  });

  it("un email repetido muestra el error en ese campo y el diálogo sigue abierto", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/usuarios");

    await user.click(await screen.findByRole("button", { name: "Nuevo usuario" }));
    const dialogo = await screen.findByRole("dialog");
    await user.type(within(dialogo).getByLabelText("Nombre"), "Otro");
    await user.type(within(dialogo).getByLabelText("Apellido"), "Admin");
    await user.type(within(dialogo).getByLabelText("Email"), g.email); // ya existe
    await user.type(within(dialogo).getByLabelText("Contraseña inicial"), "clave-123456");
    await user.click(within(dialogo).getByRole("button", { name: "Crear usuario" }));

    expect(
      await within(dialogo).findByText(/Ya existe un usuario con ese email/)
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("valida en el cliente antes de llamar a la API", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/usuarios");

    await user.click(await screen.findByRole("button", { name: "Nuevo usuario" }));
    const dialogo = await screen.findByRole("dialog");
    await user.click(within(dialogo).getByRole("button", { name: "Crear usuario" }));

    expect(await within(dialogo).findByText("Ingresá el nombre")).toBeInTheDocument();
    expect(within(dialogo).getByText("Ingresá el email")).toBeInTheDocument();
    expect(
      within(dialogo).getByText("La contraseña debe tener al menos 8 caracteres")
    ).toBeInTheDocument();
  });

  it("edita nombre y rol de otro usuario, y la tabla se actualiza", async () => {
    const g = await nuevoGimnasio();
    await conCarla(g);
    await conSesion(g.token);
    const { user } = renderApp("/usuarios");

    await user.click(await screen.findByRole("button", { name: "Editar a Carla Recepción" }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByLabelText("Nombre")).toHaveValue("Carla");
    const nombre = within(dialogo).getByLabelText("Nombre");
    await user.clear(nombre);
    await user.type(nombre, "Carolina");
    await user.selectOptions(within(dialogo).getByLabelText("Rol"), "ADMIN");
    await user.click(within(dialogo).getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Usuario actualizado")).toBeInTheDocument();
    const editada = await within(tabla()).findByRole("row", { name: /Carolina Recepción/ });
    expect(within(editada).getByText("Administrador")).toBeInTheDocument();
  });

  it("al editarse a uno mismo, el rol está bloqueado", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/usuarios");

    await user.click(await screen.findByRole("button", { name: "Editar a Ana Admin" }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByLabelText("Rol")).toBeDisabled();
    expect(within(dialogo).getByText("No podés cambiar tu propio rol.")).toBeInTheDocument();

    // Igual puede cambiar su nombre
    const nombre = within(dialogo).getByLabelText("Nombre");
    await user.clear(nombre);
    await user.type(nombre, "Anita");
    await user.click(within(dialogo).getByRole("button", { name: "Guardar cambios" }));
    expect(await within(tabla()).findByText(/Anita Admin/)).toBeInTheDocument();
  });

  it("desactiva y reactiva a un usuario; mientras está inactivo no puede usar su sesión", async () => {
    const g = await nuevoGimnasio();
    const carla = await conCarla(g);
    const tokenCarla = await apiLoginToken(g.slug, carla.email, carla.password);
    await conSesion(g.token);
    const { user } = renderApp("/usuarios");

    await user.click(await screen.findByRole("button", { name: "Desactivar a Carla Recepción" }));
    expect(await screen.findByText("Usuario desactivado")).toBeInTheDocument();
    const inactiva = await within(tabla()).findByRole("row", { name: /Carla Recepción.*Inactivo/ });
    expect(
      within(inactiva).getByRole("button", { name: "Activar a Carla Recepción" })
    ).toBeInTheDocument();
    expect(await apiMeStatus(tokenCarla)).toBe(401);

    await user.click(within(inactiva).getByRole("button", { name: "Activar a Carla Recepción" }));
    expect(await screen.findByText("Usuario activado")).toBeInTheDocument();
    await within(tabla()).findByRole("row", { name: /Carla Recepción.*Activo/ });
    expect(await apiMeStatus(tokenCarla)).toBe(200);
  });

  it("restablece la contraseña de otro usuario: avisa, la nueva funciona y cierra sus sesiones", async () => {
    const g = await nuevoGimnasio();
    const carla = await conCarla(g);
    const tokenCarla = await apiLoginToken(g.slug, carla.email, carla.password);
    await conSesion(g.token);
    const { user } = renderApp("/usuarios");

    await user.click(
      await screen.findByRole("button", { name: "Restablecer la contraseña de Carla Recepción" })
    );
    const dialogo = await screen.findByRole("dialog");

    await user.type(within(dialogo).getByLabelText("Contraseña nueva"), "corta");
    await user.click(within(dialogo).getByRole("button", { name: "Restablecer" }));
    expect(
      await within(dialogo).findByText("La contraseña debe tener al menos 8 caracteres")
    ).toBeInTheDocument();

    const campo = within(dialogo).getByLabelText("Contraseña nueva");
    await user.clear(campo);
    await user.type(campo, "reseteada-123");
    await user.click(within(dialogo).getByRole("button", { name: "Restablecer" }));

    expect(await screen.findByText("Contraseña restablecida")).toBeInTheDocument();
    expect(await apiLoginStatus(g.slug, carla.email, "reseteada-123")).toBe(200);
    expect(await apiLoginStatus(g.slug, carla.email, carla.password)).toBe(401);
    expect(await apiMeStatus(tokenCarla)).toBe(401);
    expect(await apiMeStatus(g.token)).toBe(200);
  });
});

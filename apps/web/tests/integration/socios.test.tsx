import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  apiCrearSocio,
  apiCrearUsuario,
  apiDarDeBajaSocio,
  apiListarSocios,
  apiLoginToken,
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

// Sesión de una recepcionista del gimnasio
async function comoRecepcion(g: GimnasioDePrueba) {
  const email = `carla@${g.slug}.com`;
  const carla = await apiCrearUsuario(g.token, { nombre: "Carla", apellido: "Recepción", email });
  await conSesion(await apiLoginToken(g.slug, email, carla.password));
}

describe("gestión de socios", () => {
  it("lista los socios activos ordenados por apellido, con sus datos", async () => {
    const g = await nuevoGimnasio();
    await apiCrearSocio(g.token, {
      nombre: "Lucía",
      apellido: "Pérez",
      dni: "30111222",
      email: "lucia@mail.com",
    });
    await apiCrearSocio(g.token, { nombre: "Juan", apellido: "Álvarez", dni: "28999888" });
    await conSesion(g.token);
    renderApp("/socios");

    const lucia = await screen.findByRole("row", { name: /Pérez, Lucía/ });
    expect(within(lucia).getByText("30111222")).toBeInTheDocument();
    expect(within(lucia).getByText("lucia@mail.com")).toBeInTheDocument();
    expect(within(lucia).getByText("Activo")).toBeInTheDocument();

    // La primera fila es el encabezado; después, por apellido
    const filas = within(tabla()).getAllByRole("row");
    expect(filas[1]).toHaveAccessibleName(/Álvarez, Juan/);
    expect(filas[2]).toHaveAccessibleName(/Pérez, Lucía/);
  });

  it("muestra solo los socios del propio gimnasio", async () => {
    const g = await nuevoGimnasio();
    const otro = await nuevoGimnasio();
    await apiCrearSocio(g.token, { nombre: "Propio", apellido: "Mío", dni: "30000001" });
    await apiCrearSocio(otro.token, { nombre: "Ajeno", apellido: "Otro", dni: "30000002" });
    await conSesion(g.token);
    renderApp("/socios");

    await screen.findByRole("row", { name: /Mío, Propio/ });
    expect(screen.queryByText("Otro, Ajeno")).not.toBeInTheDocument();
  });

  it("busca por nombre o DNI y filtra por estado", async () => {
    const g = await nuevoGimnasio();
    await apiCrearSocio(g.token, { nombre: "Lucía", apellido: "Pérez", dni: "30111222" });
    const juan = await apiCrearSocio(g.token, {
      nombre: "Juan",
      apellido: "Álvarez",
      dni: "28999888",
    });
    await conSesion(g.token);
    const { user } = renderApp("/socios");
    await screen.findByRole("row", { name: /Pérez, Lucía/ });

    await user.type(screen.getByRole("searchbox", { name: "Buscar socios" }), "2899");
    // La búsqueda espera 300 ms sin teclear antes de consultar: con el 1 s por defecto de waitFor
    // el margen quedaba justo cuando la suite completa corre en paralelo
    await waitFor(
      () => expect(screen.queryByRole("row", { name: /Pérez, Lucía/ })).not.toBeInTheDocument(),
      { timeout: 3000 }
    );
    expect(fila(/Álvarez, Juan/)).toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox", { name: "Buscar socios" }));
    await user.type(screen.getByRole("searchbox", { name: "Buscar socios" }), "nadie");
    expect(
      await screen.findByText("No hay socios que coincidan con la búsqueda.")
    ).toBeInTheDocument();

    // Los inactivos no aparecen con el filtro por defecto (Activos)
    await user.clear(screen.getByRole("searchbox", { name: "Buscar socios" }));
    await apiDarDeBajaSocio(g.token, juan.id);
    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "inactivos");
    expect(await screen.findByRole("row", { name: /Álvarez, Juan/ })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("row", { name: /Pérez, Lucía/ })).not.toBeInTheDocument()
    );
  });

  it("crea un socio desde el diálogo: aparece en la tabla, avisa y se guarda en la API", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/socios");

    await user.click(await screen.findByRole("button", { name: "Nuevo socio" }));
    const dialogo = await screen.findByRole("dialog");
    await user.type(within(dialogo).getByLabelText("Nombre"), "Lucía");
    await user.type(within(dialogo).getByLabelText("Apellido"), "Pérez");
    await user.type(within(dialogo).getByLabelText("DNI"), "30111222");
    await user.type(within(dialogo).getByLabelText("Teléfono (opcional)"), "291-555");
    await user.click(within(dialogo).getByRole("button", { name: "Crear socio" }));

    expect(await screen.findByText("Socio creado")).toBeInTheDocument();
    expect(await screen.findByRole("row", { name: /Pérez, Lucía/ })).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();

    const [creado] = await apiListarSocios(g.token);
    expect(creado).toMatchObject({
      nombre: "Lucía",
      dni: "30111222",
      telefono: "291-555",
      email: null,
    });
  });

  it("valida en el cliente: obligatorios, DNI de 7 u 8 dígitos y email válido", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/socios");

    await user.click(await screen.findByRole("button", { name: "Nuevo socio" }));
    const dialogo = await screen.findByRole("dialog");
    await user.type(within(dialogo).getByLabelText("DNI"), "30.111.222");
    await user.type(within(dialogo).getByLabelText("Email (opcional)"), "no-es-email");
    await user.click(within(dialogo).getByRole("button", { name: "Crear socio" }));

    expect(await within(dialogo).findByText("Ingresá el nombre")).toBeInTheDocument();
    expect(within(dialogo).getByText("Ingresá el apellido")).toBeInTheDocument();
    expect(
      within(dialogo).getByText("El DNI debe tener 7 u 8 dígitos, sin puntos")
    ).toBeInTheDocument();
    expect(within(dialogo).getByText("El email no es válido")).toBeInTheDocument();
    expect(await apiListarSocios(g.token)).toHaveLength(0);
  });

  it("un DNI repetido muestra el error en ese campo y el diálogo sigue abierto", async () => {
    const g = await nuevoGimnasio();
    await apiCrearSocio(g.token, { nombre: "Lucía", apellido: "Pérez", dni: "30111222" });
    await conSesion(g.token);
    const { user } = renderApp("/socios");

    await user.click(await screen.findByRole("button", { name: "Nuevo socio" }));
    const dialogo = await screen.findByRole("dialog");
    await user.type(within(dialogo).getByLabelText("Nombre"), "Otra");
    await user.type(within(dialogo).getByLabelText("Apellido"), "Persona");
    await user.type(within(dialogo).getByLabelText("DNI"), "30111222");
    await user.click(within(dialogo).getByRole("button", { name: "Crear socio" }));

    expect(
      await within(dialogo).findByText("Ya existe un socio con ese DNI en este gimnasio")
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(await apiListarSocios(g.token)).toHaveLength(1);
  });

  it("edita un socio, y dejar un dato opcional vacío lo borra", async () => {
    const g = await nuevoGimnasio();
    await apiCrearSocio(g.token, {
      nombre: "Lucía",
      apellido: "Pérez",
      dni: "30111222",
      email: "lucia@mail.com",
      telefono: "291-555",
    });
    await conSesion(g.token);
    const { user } = renderApp("/socios");

    await user.click(await screen.findByRole("button", { name: "Editar a Pérez, Lucía" }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByLabelText("Email (opcional)")).toHaveValue("lucia@mail.com");

    await user.clear(within(dialogo).getByLabelText("Email (opcional)"));
    await user.clear(within(dialogo).getByLabelText("Nombre"));
    await user.type(within(dialogo).getByLabelText("Nombre"), "Lucía Inés");
    await user.click(within(dialogo).getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Socio actualizado")).toBeInTheDocument();
    expect(await screen.findByRole("row", { name: /Pérez, Lucía Inés/ })).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();

    const [editado] = await apiListarSocios(g.token);
    expect(editado).toMatchObject({
      nombre: "Lucía Inés",
      email: null, // se vació
      telefono: "291-555", // no se tocó
    });
  });

  it("un administrador da de baja y reactiva a un socio", async () => {
    const g = await nuevoGimnasio();
    await apiCrearSocio(g.token, { nombre: "Juan", apellido: "Álvarez", dni: "28999888" });
    await conSesion(g.token);
    const { user } = renderApp("/socios");
    await user.selectOptions(await screen.findByLabelText("Filtrar por estado"), "todos");

    await user.click(await screen.findByRole("button", { name: "Dar de baja a Álvarez, Juan" }));
    expect(await screen.findByText("Socio dado de baja")).toBeInTheDocument();
    expect(await within(fila(/Álvarez, Juan/)).findByText("Inactivo")).toBeInTheDocument();
    expect((await apiListarSocios(g.token))[0]?.activo).toBe(false);

    await user.click(await screen.findByRole("button", { name: "Reactivar a Álvarez, Juan" }));
    expect(await screen.findByText("Socio reactivado")).toBeInTheDocument();
    await waitFor(async () => expect((await apiListarSocios(g.token))[0]?.activo).toBe(true));
  });

  it("la recepción crea y edita socios, pero no tiene cómo darlos de baja", async () => {
    const g = await nuevoGimnasio();
    await apiCrearSocio(g.token, { nombre: "Juan", apellido: "Álvarez", dni: "28999888" });
    await comoRecepcion(g);
    renderApp("/socios");

    const juan = await screen.findByRole("row", { name: /Álvarez, Juan/ });
    expect(screen.getByRole("button", { name: "Nuevo socio" })).toBeInTheDocument();
    expect(within(juan).getByRole("button", { name: /Editar/ })).toBeInTheDocument();
    expect(within(juan).queryByRole("button", { name: /Dar de baja/ })).not.toBeInTheDocument();
  });

  it("el detalle muestra los datos del socio y se llega desde la lista", async () => {
    const g = await nuevoGimnasio();
    await apiCrearSocio(g.token, {
      nombre: "Lucía",
      apellido: "Pérez",
      dni: "30111222",
      fechaNacimiento: "1990-05-20",
    });
    await conSesion(g.token);
    const { user, router } = renderApp("/socios");

    await user.click(await screen.findByRole("link", { name: "Pérez, Lucía" }));

    expect(await screen.findByRole("heading", { name: "Lucía Pérez" })).toBeInTheDocument();
    expect(screen.getByText("30111222")).toBeInTheDocument();
    // Se muestra en UTC: no se corre al día anterior en Argentina
    expect(screen.getByText("20/5/1990")).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/^\/socios\/.+/);

    await user.click(screen.getByRole("link", { name: "← Volver a socios" }));
    expect(await screen.findByRole("heading", { name: "Socios" })).toBeInTheDocument();
  });

  it("el detalle de un socio de otro gimnasio dice que no existe", async () => {
    const g = await nuevoGimnasio();
    const otro = await nuevoGimnasio();
    const ajeno = await apiCrearSocio(otro.token, {
      nombre: "Ajeno",
      apellido: "Otro",
      dni: "30000002",
    });
    await conSesion(g.token);
    renderApp(`/socios/${ajeno.id}`);

    expect(await screen.findByText("No encontramos a ese socio.")).toBeInTheDocument();
    expect(screen.queryByText("Ajeno Otro")).not.toBeInTheDocument();
  });

  it("el enlace Socios del menú lleva a la pantalla, también para la recepción", async () => {
    const g = await nuevoGimnasio();
    await comoRecepcion(g);
    const { user } = renderApp("/");

    await user.click(await screen.findByRole("link", { name: "Socios" }));

    expect(
      await screen.findByText("Las personas que entrenan en el gimnasio.")
    ).toBeInTheDocument();
  });
});

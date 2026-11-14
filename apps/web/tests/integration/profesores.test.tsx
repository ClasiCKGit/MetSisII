import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  apiCrearProfesor,
  apiCrearUsuario,
  apiListarProfesores,
  apiLoginToken,
  conSesion,
  nuevoGimnasio,
} from "../helpers/api";
import { esperarQueSeCierreElDialogo } from "../helpers/dialogo";
import { renderApp } from "../helpers/render";

// hidden: true porque, mientras hay un diálogo abierto, el resto de la página queda inerte
// (oculto para los lectores de pantalla). Los findBy* esperan a que sea accesible.
const tabla = () => screen.getByRole("table", { hidden: true });
const fila = (nombre: string | RegExp) => within(tabla()).getByRole("row", { name: nombre });

describe("gestión de profesores", () => {
  it("lista los profesores con sus datos y deja un guion en los que faltan", async () => {
    const g = await nuevoGimnasio();
    await apiCrearProfesor(g.token, {
      nombre: "Marina",
      apellido: "Silva",
      especialidad: "Jiu-Jitsu",
      email: "marina@mail.com",
    });
    await apiCrearProfesor(g.token, { nombre: "Diego", apellido: "Torres" });
    await conSesion(g.token);
    renderApp("/profesores");

    expect(await screen.findByText("Marina Silva")).toBeInTheDocument();
    const marina = fila(/Marina Silva/);
    expect(within(marina).getByText("Jiu-Jitsu")).toBeInTheDocument();
    expect(within(marina).getByText("marina@mail.com")).toBeInTheDocument();
    expect(within(marina).getByText("Activo")).toBeInTheDocument();

    // Diego no tiene especialidad ni email: se muestra un guion en cada lugar
    expect(within(fila(/Diego Torres/)).getAllByText("—")).toHaveLength(2);
  });

  it("muestra solo los profesores del propio gimnasio", async () => {
    const g = await nuevoGimnasio();
    const otro = await nuevoGimnasio();
    await apiCrearProfesor(g.token, { nombre: "Propio", apellido: "Mío" });
    await apiCrearProfesor(otro.token, { nombre: "Ajeno", apellido: "Otro" });
    await conSesion(g.token);
    renderApp("/profesores");

    await screen.findByText("Propio Mío");
    expect(screen.queryByText("Ajeno Otro")).not.toBeInTheDocument();
  });

  it("avisa cuando todavía no hay profesores", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    renderApp("/profesores");

    expect(await screen.findByText("Todavía no hay profesores cargados.")).toBeInTheDocument();
  });

  it("crea un profesor con solo nombre y apellido: aparece en la tabla, avisa, y lo opcional queda vacío", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/profesores");

    await user.click(await screen.findByRole("button", { name: "Nuevo profesor" }));
    const dialogo = await screen.findByRole("dialog");
    await user.type(within(dialogo).getByLabelText("Nombre"), "Lucía");
    await user.type(within(dialogo).getByLabelText("Apellido"), "Paz");
    await user.click(within(dialogo).getByRole("button", { name: "Crear profesor" }));

    expect(await screen.findByText("Profesor creado")).toBeInTheDocument();
    expect(await within(tabla()).findByText("Lucía Paz")).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();

    // Los campos que se dejaron vacíos viajan como null, no como ""
    const [creado] = await apiListarProfesores(g.token);
    expect(creado).toMatchObject({
      nombre: "Lucía",
      apellido: "Paz",
      dni: null,
      email: null,
      telefono: null,
      especialidad: null,
    });
  });

  it("valida en el cliente: nombre y apellido obligatorios, y un email con formato válido", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/profesores");

    await user.click(await screen.findByRole("button", { name: "Nuevo profesor" }));
    const dialogo = await screen.findByRole("dialog");
    await user.click(within(dialogo).getByRole("button", { name: "Crear profesor" }));

    expect(await within(dialogo).findByText("Ingresá el nombre")).toBeInTheDocument();
    expect(within(dialogo).getByText("Ingresá el apellido")).toBeInTheDocument();

    await user.type(within(dialogo).getByLabelText("Email"), "no-es-un-email");
    await user.click(within(dialogo).getByRole("button", { name: "Crear profesor" }));
    expect(await within(dialogo).findByText("El email no es válido")).toBeInTheDocument();

    // Nada de eso llegó a la API
    expect(await apiListarProfesores(g.token)).toHaveLength(0);
  });

  it("edita un profesor, y dejar un dato opcional vacío lo borra", async () => {
    const g = await nuevoGimnasio();
    await apiCrearProfesor(g.token, {
      nombre: "Marina",
      apellido: "Silva",
      especialidad: "Yoga",
      telefono: "291-1234567",
    });
    await conSesion(g.token);
    const { user } = renderApp("/profesores");

    await user.click(await screen.findByRole("button", { name: "Editar a Marina Silva" }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByLabelText("Especialidad")).toHaveValue("Yoga");

    await user.clear(within(dialogo).getByLabelText("Especialidad"));
    await user.clear(within(dialogo).getByLabelText("Nombre"));
    await user.type(within(dialogo).getByLabelText("Nombre"), "Marina Inés");
    await user.click(within(dialogo).getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Profesor actualizado")).toBeInTheDocument();
    expect(await within(tabla()).findByText("Marina Inés Silva")).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();

    const [editado] = await apiListarProfesores(g.token);
    expect(editado).toMatchObject({
      nombre: "Marina Inés",
      especialidad: null, // se vació
      telefono: "291-1234567", // no se tocó
    });
  });

  it("desactiva y reactiva a un profesor", async () => {
    const g = await nuevoGimnasio();
    await apiCrearProfesor(g.token, { nombre: "Diego", apellido: "Torres" });
    await conSesion(g.token);
    const { user } = renderApp("/profesores");

    await user.click(await screen.findByRole("button", { name: "Desactivar a Diego Torres" }));
    expect(await screen.findByText("Profesor desactivado")).toBeInTheDocument();
    expect(await within(fila(/Diego Torres/)).findByText("Inactivo")).toBeInTheDocument();
    expect((await apiListarProfesores(g.token))[0]?.activo).toBe(false);

    await user.click(await screen.findByRole("button", { name: "Activar a Diego Torres" }));
    expect(await screen.findByText("Profesor activado")).toBeInTheDocument();
    await waitFor(async () => expect((await apiListarProfesores(g.token))[0]?.activo).toBe(true));
  });

  it("la recepción ve la lista pero no tiene cómo crear, editar ni desactivar", async () => {
    const g = await nuevoGimnasio();
    await apiCrearProfesor(g.token, { nombre: "Marina", apellido: "Silva" });
    const email = `carla@${g.slug}.com`;
    const carla = await apiCrearUsuario(g.token, {
      nombre: "Carla",
      apellido: "Recepción",
      email,
    });
    await conSesion(await apiLoginToken(g.slug, email, carla.password));
    renderApp("/profesores");

    expect(await screen.findByText("Marina Silva")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nuevo profesor" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Desactivar/ })).not.toBeInTheDocument();
  });

  it("el enlace Profesores del menú lleva a la pantalla, también para la recepción", async () => {
    const g = await nuevoGimnasio();
    const email = `carla@${g.slug}.com`;
    const carla = await apiCrearUsuario(g.token, {
      nombre: "Carla",
      apellido: "Recepción",
      email,
    });
    await conSesion(await apiLoginToken(g.slug, email, carla.password));
    const { user } = renderApp("/");

    await user.click(await screen.findByRole("link", { name: "Profesores" }));

    expect(await screen.findByText("Quienes dan clases en el gimnasio.")).toBeInTheDocument();
  });
});

import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  apiCrearActividad,
  apiCrearUsuario,
  apiListarActividades,
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

describe("gestión de actividades", () => {
  it("lista las actividades con su descripción y cupo, y dice 'Sin límite' si no hay cupo", async () => {
    const g = await nuevoGimnasio();
    await apiCrearActividad(g.token, {
      nombre: "Crossfit",
      descripcion: "Alta intensidad",
      cupo: 15,
    });
    await apiCrearActividad(g.token, { nombre: "Musculación" });
    await conSesion(g.token);
    renderApp("/actividades");

    expect(await screen.findByText("Crossfit")).toBeInTheDocument();
    const crossfit = fila(/Crossfit/);
    expect(within(crossfit).getByText("Alta intensidad")).toBeInTheDocument();
    expect(within(crossfit).getByText("15")).toBeInTheDocument();
    expect(within(crossfit).getByText("Activa")).toBeInTheDocument();

    expect(within(fila(/Musculación/)).getByText("Sin límite")).toBeInTheDocument();
  });

  it("muestra solo las actividades del propio gimnasio", async () => {
    const g = await nuevoGimnasio();
    const otro = await nuevoGimnasio();
    await apiCrearActividad(g.token, { nombre: "Propia" });
    await apiCrearActividad(otro.token, { nombre: "Ajena" });
    await conSesion(g.token);
    renderApp("/actividades");

    await screen.findByText("Propia");
    expect(screen.queryByText("Ajena")).not.toBeInTheDocument();
  });

  it("avisa cuando todavía no hay actividades", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    renderApp("/actividades");

    expect(await screen.findByText("Todavía no hay actividades cargadas.")).toBeInTheDocument();
  });

  it("crea una actividad solo con nombre: aparece en la tabla, avisa, y lo opcional queda vacío", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/actividades");

    await user.click(await screen.findByRole("button", { name: "Nueva actividad" }));
    const dialogo = await screen.findByRole("dialog");
    await user.type(within(dialogo).getByLabelText("Nombre"), "Yoga");
    await user.click(within(dialogo).getByRole("button", { name: "Crear actividad" }));

    expect(await screen.findByText("Actividad creada")).toBeInTheDocument();
    expect(await within(tabla()).findByText("Yoga")).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();

    // Lo que se dejó vacío viaja como null, no como ""
    const [creada] = await apiListarActividades(g.token);
    expect(creada).toMatchObject({ nombre: "Yoga", descripcion: null, cupo: null, activa: true });
  });

  it("el cupo se envía como número", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/actividades");

    await user.click(await screen.findByRole("button", { name: "Nueva actividad" }));
    const dialogo = await screen.findByRole("dialog");
    await user.type(within(dialogo).getByLabelText("Nombre"), "Boxeo");
    await user.type(within(dialogo).getByLabelText("Cupo"), "20");
    await user.click(within(dialogo).getByRole("button", { name: "Crear actividad" }));

    expect(await screen.findByText("Actividad creada")).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();

    const [creada] = await apiListarActividades(g.token);
    expect(creada?.cupo).toBe(20);
  });

  it("valida en el cliente: nombre obligatorio y un cupo que sea un entero mayor a 0", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/actividades");

    await user.click(await screen.findByRole("button", { name: "Nueva actividad" }));
    const dialogo = await screen.findByRole("dialog");
    await user.click(within(dialogo).getByRole("button", { name: "Crear actividad" }));
    expect(await within(dialogo).findByText("Ingresá el nombre")).toBeInTheDocument();

    await user.type(within(dialogo).getByLabelText("Nombre"), "Yoga");
    for (const invalido of ["0", "abc", "2.5", "-3"]) {
      await user.clear(within(dialogo).getByLabelText("Cupo"));
      await user.type(within(dialogo).getByLabelText("Cupo"), invalido);
      await user.click(within(dialogo).getByRole("button", { name: "Crear actividad" }));
      expect(
        await within(dialogo).findByText("El cupo debe ser un número entero mayor a 0")
      ).toBeInTheDocument();
    }

    // Nada de eso llegó a la API
    expect(await apiListarActividades(g.token)).toHaveLength(0);
  });

  it("edita una actividad, y vaciar el cupo lo deja sin límite", async () => {
    const g = await nuevoGimnasio();
    await apiCrearActividad(g.token, {
      nombre: "Crossfit",
      descripcion: "Alta intensidad",
      cupo: 15,
    });
    await conSesion(g.token);
    const { user } = renderApp("/actividades");

    await user.click(await screen.findByRole("button", { name: "Editar Crossfit" }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByLabelText("Cupo")).toHaveValue("15");

    await user.clear(within(dialogo).getByLabelText("Cupo"));
    await user.clear(within(dialogo).getByLabelText("Nombre"));
    await user.type(within(dialogo).getByLabelText("Nombre"), "Crossfit Pro");
    await user.click(within(dialogo).getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Actividad actualizada")).toBeInTheDocument();
    expect(await within(tabla()).findByText("Crossfit Pro")).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();

    const [editada] = await apiListarActividades(g.token);
    expect(editada).toMatchObject({
      nombre: "Crossfit Pro",
      cupo: null, // se vació
      descripcion: "Alta intensidad", // no se tocó
    });
  });

  it("desactiva y reactiva una actividad", async () => {
    const g = await nuevoGimnasio();
    await apiCrearActividad(g.token, { nombre: "Yoga" });
    await conSesion(g.token);
    const { user } = renderApp("/actividades");

    await user.click(await screen.findByRole("button", { name: "Desactivar Yoga" }));
    expect(await screen.findByText("Actividad desactivada")).toBeInTheDocument();
    expect(await within(fila(/Yoga/)).findByText("Inactiva")).toBeInTheDocument();
    expect((await apiListarActividades(g.token))[0]?.activa).toBe(false);

    await user.click(await screen.findByRole("button", { name: "Activar Yoga" }));
    expect(await screen.findByText("Actividad activada")).toBeInTheDocument();
    await waitFor(async () => expect((await apiListarActividades(g.token))[0]?.activa).toBe(true));
  });

  it("la recepción ve la lista pero no tiene cómo crear, editar ni desactivar", async () => {
    const g = await nuevoGimnasio();
    await apiCrearActividad(g.token, { nombre: "Yoga" });
    const email = `carla@${g.slug}.com`;
    const carla = await apiCrearUsuario(g.token, {
      nombre: "Carla",
      apellido: "Recepción",
      email,
    });
    await conSesion(await apiLoginToken(g.slug, email, carla.password));
    renderApp("/actividades");

    expect(await screen.findByText("Yoga")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nueva actividad" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Desactivar/ })).not.toBeInTheDocument();
  });

  it("el enlace Actividades del menú lleva a la pantalla, también para la recepción", async () => {
    const g = await nuevoGimnasio();
    const email = `carla@${g.slug}.com`;
    const carla = await apiCrearUsuario(g.token, {
      nombre: "Carla",
      apellido: "Recepción",
      email,
    });
    await conSesion(await apiLoginToken(g.slug, email, carla.password));
    const { user } = renderApp("/");

    await user.click(await screen.findByRole("link", { name: "Actividades" }));

    expect(await screen.findByText("Lo que ofrece el gimnasio.")).toBeInTheDocument();
  });
});

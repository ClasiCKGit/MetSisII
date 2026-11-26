import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  apiCrearActividad,
  apiCrearTipoMembresia,
  apiCrearUsuario,
  apiDarDeBajaTipoMembresia,
  apiDesactivarActividad,
  apiListarTiposMembresia,
  apiLoginToken,
  conSesion,
  nuevoGimnasio,
} from "../helpers/api";
import { esperarQueSeCierreElDialogo } from "../helpers/dialogo";
import { renderApp } from "../helpers/render";

const seccionPlanes = () => within(screen.getByRole("region", { name: "Planes y precios" }));

describe("detalle de una actividad: planes y precios", () => {
  it("lista los planes con su precio, duración y clases", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    await apiCrearTipoMembresia(g.token, {
      actividadId: yoga.id,
      nombre: "Mensual",
      precio: 12500.5,
      duracionDias: 30,
    });
    await conSesion(g.token);
    renderApp(`/actividades/${yoga.id}`);

    await screen.findByRole("region", { name: "Planes y precios" });
    expect(await seccionPlanes().findByText("Mensual")).toBeInTheDocument();
    expect(seccionPlanes().getByText("$12.500,50")).toBeInTheDocument();
    expect(seccionPlanes().getByText("30 días · clases ilimitadas")).toBeInTheDocument();
  });

  it("avisa que sin planes no se puede inscribir", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    await conSesion(g.token);
    renderApp(`/actividades/${yoga.id}`);

    await screen.findByRole("region", { name: "Planes y precios" });
    expect(
      await seccionPlanes().findByText(/Todavía no hay planes para esta actividad/)
    ).toBeInTheDocument();
  });

  it("crea un plan con precio con coma decimal y cantidad de clases", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    await conSesion(g.token);
    const { user } = renderApp(`/actividades/${yoga.id}`);

    await user.click(await screen.findByRole("button", { name: "Agregar plan" }));
    const dialogo = within(await screen.findByRole("dialog"));
    await user.type(dialogo.getByLabelText("Nombre"), "8 clases");
    await user.type(dialogo.getByLabelText("Precio"), "9800,75");
    await user.type(dialogo.getByLabelText("Duración (días)"), "30");
    await user.type(dialogo.getByLabelText("Cantidad de clases"), "8");
    await user.click(dialogo.getByRole("button", { name: "Crear plan" }));

    expect(await screen.findByText("Plan creado")).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();
    expect(await seccionPlanes().findByText("$9.800,75")).toBeInTheDocument();
    expect(seccionPlanes().getByText("30 días · 8 clases")).toBeInTheDocument();
    const [plan] = await apiListarTiposMembresia(g.token, yoga.id);
    expect(plan).toMatchObject({ nombre: "8 clases", duracionDias: 30, cantidadClases: 8 });
    expect(Number(plan?.precio)).toBe(9800.75);
  });

  it("valida precio, duración y clases en el cliente, sin llamar a la API", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    await conSesion(g.token);
    const { user } = renderApp(`/actividades/${yoga.id}`);

    await user.click(await screen.findByRole("button", { name: "Agregar plan" }));
    const dialogo = within(await screen.findByRole("dialog"));
    await user.type(dialogo.getByLabelText("Precio"), "12,345");
    await user.type(dialogo.getByLabelText("Duración (días)"), "0");
    await user.type(dialogo.getByLabelText("Cantidad de clases"), "abc");
    await user.click(dialogo.getByRole("button", { name: "Crear plan" }));

    expect(await dialogo.findByText("Ingresá el nombre")).toBeInTheDocument();
    expect(
      dialogo.getByText("Ingresá un precio válido, por ejemplo 12500 o 12500,50")
    ).toBeInTheDocument();
    expect(
      dialogo.getByText("La duración debe ser una cantidad de días mayor a 0")
    ).toBeInTheDocument();
    expect(
      dialogo.getByText("La cantidad de clases debe ser un número mayor a 0")
    ).toBeInTheDocument();
    expect(await apiListarTiposMembresia(g.token, yoga.id)).toEqual([]);
  });

  it("edita el precio de un plan: el formulario arranca con los valores actuales", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    await apiCrearTipoMembresia(g.token, {
      actividadId: yoga.id,
      nombre: "Mensual",
      precio: 12500.5,
      duracionDias: 30,
    });
    await conSesion(g.token);
    const { user } = renderApp(`/actividades/${yoga.id}`);

    await user.click(await screen.findByRole("button", { name: "Editar el plan Mensual" }));
    const dialogo = within(await screen.findByRole("dialog"));
    expect(dialogo.getByLabelText("Precio")).toHaveValue("12500,5");
    expect(dialogo.getByLabelText("Duración (días)")).toHaveValue("30");
    await user.clear(dialogo.getByLabelText("Precio"));
    await user.type(dialogo.getByLabelText("Precio"), "14000");
    await user.click(dialogo.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Plan actualizado")).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();
    expect(await seccionPlanes().findByText("$14.000,00")).toBeInTheDocument();
    const [plan] = await apiListarTiposMembresia(g.token, yoga.id);
    expect(Number(plan?.precio)).toBe(14000);
  });

  it("da de baja un plan y lo reactiva", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    await apiCrearTipoMembresia(g.token, {
      actividadId: yoga.id,
      nombre: "Mensual",
      precio: 12500,
      duracionDias: 30,
    });
    await conSesion(g.token);
    const { user } = renderApp(`/actividades/${yoga.id}`);

    await user.click(await screen.findByRole("button", { name: "Dar de baja el plan Mensual" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Dar de baja el plan" })).getByRole(
        "button",
        { name: "Dar de baja" }
      )
    );
    expect(await screen.findByText("Plan dado de baja")).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();
    expect(await seccionPlanes().findByText("Inactivo")).toBeInTheDocument();
    expect((await apiListarTiposMembresia(g.token, yoga.id))[0]?.activo).toBe(false);

    await user.click(screen.getByRole("button", { name: "Reactivar el plan Mensual" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Reactivar plan" })).getByRole("button", {
        name: "Reactivar",
      })
    );
    expect(await screen.findByText("Plan reactivado")).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();
    expect(seccionPlanes().queryByText("Inactivo")).not.toBeInTheDocument();
    expect((await apiListarTiposMembresia(g.token, yoga.id))[0]?.activo).toBe(true);
  });

  it("un plan dado de baja no se ofrece al inscribir a un socio", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    const mensual = await apiCrearTipoMembresia(g.token, {
      actividadId: yoga.id,
      nombre: "Mensual",
      precio: 12500,
      duracionDias: 30,
    });
    await apiCrearTipoMembresia(g.token, {
      actividadId: yoga.id,
      nombre: "Trimestral",
      precio: 33000,
      duracionDias: 90,
    });
    await apiDarDeBajaTipoMembresia(g.token, mensual.id);
    await conSesion(g.token);
    renderApp(`/actividades/${yoga.id}`);

    await screen.findByRole("region", { name: "Planes y precios" });
    expect(await seccionPlanes().findByText("Trimestral")).toBeInTheDocument();
    const planes = await apiListarTiposMembresia(g.token, yoga.id);
    expect(planes.map((p) => [p.nombre, p.activo])).toEqual([
      ["Mensual", false],
      ["Trimestral", true],
    ]);
  });

  it("con la actividad dada de baja no ofrece agregar planes", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    await apiDesactivarActividad(g.token, yoga.id);
    await conSesion(g.token);
    renderApp(`/actividades/${yoga.id}`);

    expect(
      await screen.findByText("La actividad está dada de baja: no se pueden agregar planes.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agregar plan" })).not.toBeInTheDocument();
  });

  it("la recepción ve los planes pero no puede crearlos, editarlos ni darlos de baja", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    await apiCrearTipoMembresia(g.token, {
      actividadId: yoga.id,
      nombre: "Mensual",
      precio: 12500,
      duracionDias: 30,
    });
    const email = `carla-${crypto.randomUUID()}@test.com`;
    const carla = await apiCrearUsuario(g.token, { nombre: "Carla", apellido: "Recepción", email });
    await conSesion(await apiLoginToken(g.slug, email, carla.password));
    renderApp(`/actividades/${yoga.id}`);

    await screen.findByRole("region", { name: "Planes y precios" });
    expect(await seccionPlanes().findByText("Mensual")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agregar plan" })).not.toBeInTheDocument();
    expect(
      seccionPlanes().queryByRole("button", { name: /Editar|Dar de baja|Reactivar/ })
    ).not.toBeInTheDocument();
  });
});

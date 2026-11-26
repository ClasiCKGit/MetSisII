import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  apiCrearActividad,
  apiCrearHorario,
  apiCrearProfesor,
  apiCrearUsuario,
  apiDesactivarActividad,
  apiListarHorarios,
  apiLoginToken,
  apiVincularProfesor,
  conSesion,
  nuevoGimnasio,
} from "../helpers/api";
import { esperarQueSeCierreElDialogo } from "../helpers/dialogo";
import { renderApp } from "../helpers/render";

const seccionHorarios = () => within(screen.getByRole("region", { name: "Horarios" }));

describe("detalle de una actividad: horarios", () => {
  it("lista los horarios ordenados por día y hora, con su profesor", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    const marina = await apiCrearProfesor(g.token, { nombre: "Marina", apellido: "Silva" });
    const vinculo = await apiVincularProfesor(g.token, yoga.id, marina.id);
    await apiCrearHorario(g.token, {
      actividadId: yoga.id,
      diaSemana: "MIERCOLES",
      horaInicio: "18:00",
      horaFin: "19:00",
    });
    await apiCrearHorario(g.token, {
      actividadId: yoga.id,
      diaSemana: "LUNES",
      horaInicio: "09:00",
      horaFin: "10:00",
      actividadProfesorId: vinculo.id,
    });
    await conSesion(g.token);
    renderApp(`/actividades/${yoga.id}`);

    await screen.findByRole("region", { name: "Horarios" });
    // El nombre del profesor llega con otra consulta (la de los profesores de la actividad)
    expect(await seccionHorarios().findByText("Marina Silva")).toBeInTheDocument();
    const filas = seccionHorarios().getAllByRole("listitem");
    expect(filas.map((fila) => fila.textContent)).toEqual([
      expect.stringContaining("Lunes · 09:00 a 10:00Marina Silva"),
      expect.stringContaining("Miércoles · 18:00 a 19:00Sin profesor asignado"),
    ]);
  });

  it("avisa cuando la actividad todavía no tiene horarios", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    await conSesion(g.token);
    renderApp(`/actividades/${yoga.id}`);

    await screen.findByRole("region", { name: "Horarios" });
    expect(
      await seccionHorarios().findByText("Todavía no hay horarios cargados para esta actividad.")
    ).toBeInTheDocument();
  });

  it("agrega un horario con profesor: aparece en la lista y se guarda", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    const marina = await apiCrearProfesor(g.token, { nombre: "Marina", apellido: "Silva" });
    const vinculo = await apiVincularProfesor(g.token, yoga.id, marina.id);
    await conSesion(g.token);
    const { user } = renderApp(`/actividades/${yoga.id}`);

    await user.click(await screen.findByRole("button", { name: "Agregar horario" }));
    const dialogo = within(await screen.findByRole("dialog"));
    await user.selectOptions(dialogo.getByLabelText("Día"), "Martes");
    await user.type(dialogo.getByLabelText("Desde"), "07:30");
    await user.type(dialogo.getByLabelText("Hasta"), "08:30");
    await user.selectOptions(dialogo.getByLabelText("Profesor"), "Marina Silva");
    await user.click(dialogo.getByRole("button", { name: "Agregar horario" }));

    expect(await screen.findByText("Horario agregado")).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();
    expect(await seccionHorarios().findByText("Martes · 07:30 a 08:30")).toBeInTheDocument();
    expect(await apiListarHorarios(g.token, yoga.id)).toEqual([
      expect.objectContaining({
        diaSemana: "MARTES",
        horaInicio: "07:30",
        horaFin: "08:30",
        actividadProfesorId: vinculo.id,
      }),
    ]);
  });

  it("valida en el cliente el día, el formato y el orden de las horas, sin llamar a la API", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    await conSesion(g.token);
    const { user } = renderApp(`/actividades/${yoga.id}`);

    await user.click(await screen.findByRole("button", { name: "Agregar horario" }));
    const dialogo = within(await screen.findByRole("dialog"));
    await user.type(dialogo.getByLabelText("Desde"), "8:30");
    await user.type(dialogo.getByLabelText("Hasta"), "08:00");
    await user.click(dialogo.getByRole("button", { name: "Agregar horario" }));

    expect(await dialogo.findByText("Indicá el día de la semana")).toBeInTheDocument();
    expect(
      dialogo.getByText("Usá el formato HH:MM, por ejemplo 08:30 o 18:00")
    ).toBeInTheDocument();

    await user.clear(dialogo.getByLabelText("Desde"));
    await user.type(dialogo.getByLabelText("Desde"), "09:00");
    await user.selectOptions(dialogo.getByLabelText("Día"), "Lunes");
    await user.click(dialogo.getByRole("button", { name: "Agregar horario" }));
    expect(await dialogo.findByText("Tiene que terminar después de empezar")).toBeInTheDocument();
    expect(await apiListarHorarios(g.token, yoga.id)).toEqual([]);
  });

  it("edita un horario: cambia la hora y quita el profesor", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    const marina = await apiCrearProfesor(g.token, { nombre: "Marina", apellido: "Silva" });
    const vinculo = await apiVincularProfesor(g.token, yoga.id, marina.id);
    await apiCrearHorario(g.token, {
      actividadId: yoga.id,
      diaSemana: "LUNES",
      horaInicio: "09:00",
      horaFin: "10:00",
      actividadProfesorId: vinculo.id,
    });
    await conSesion(g.token);
    const { user } = renderApp(`/actividades/${yoga.id}`);

    await user.click(
      await screen.findByRole("button", { name: "Editar el horario del lunes de 09:00 a 10:00" })
    );
    const dialogo = within(await screen.findByRole("dialog"));
    expect(dialogo.getByLabelText("Desde")).toHaveValue("09:00");
    await user.clear(dialogo.getByLabelText("Hasta"));
    await user.type(dialogo.getByLabelText("Hasta"), "11:00");
    await user.selectOptions(dialogo.getByLabelText("Profesor"), "Sin profesor asignado");
    await user.click(dialogo.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Horario actualizado")).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();
    expect(await seccionHorarios().findByText("Lunes · 09:00 a 11:00")).toBeInTheDocument();
    expect(await apiListarHorarios(g.token, yoga.id)).toEqual([
      expect.objectContaining({ horaFin: "11:00", actividadProfesorId: null }),
    ]);
  });

  it("borra un horario después de confirmar", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    await apiCrearHorario(g.token, {
      actividadId: yoga.id,
      diaSemana: "VIERNES",
      horaInicio: "20:00",
      horaFin: "21:00",
    });
    await conSesion(g.token);
    const { user } = renderApp(`/actividades/${yoga.id}`);

    await user.click(
      await screen.findByRole("button", { name: "Borrar el horario del viernes de 20:00 a 21:00" })
    );
    const dialogo = within(await screen.findByRole("dialog"));
    await user.click(dialogo.getByRole("button", { name: "Borrar horario" }));

    expect(await screen.findByText("Horario borrado")).toBeInTheDocument();
    expect(
      await seccionHorarios().findByText("Todavía no hay horarios cargados para esta actividad.")
    ).toBeInTheDocument();
    expect(await apiListarHorarios(g.token, yoga.id)).toEqual([]);
  });

  it("al quitar al profesor de la actividad, sus horarios quedan sin profesor", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    const marina = await apiCrearProfesor(g.token, { nombre: "Marina", apellido: "Silva" });
    const vinculo = await apiVincularProfesor(g.token, yoga.id, marina.id);
    await apiCrearHorario(g.token, {
      actividadId: yoga.id,
      diaSemana: "LUNES",
      horaInicio: "09:00",
      horaFin: "10:00",
      actividadProfesorId: vinculo.id,
    });
    await conSesion(g.token);
    const { user } = renderApp(`/actividades/${yoga.id}`);

    await screen.findByRole("region", { name: "Horarios" });
    expect(await seccionHorarios().findByText("Marina Silva")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Quitar a Marina Silva" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Quitar profesor" })
    );
    await esperarQueSeCierreElDialogo();

    expect(await seccionHorarios().findByText("Sin profesor asignado")).toBeInTheDocument();
  });

  it("con la actividad dada de baja no ofrece agregar horarios", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    await apiDesactivarActividad(g.token, yoga.id);
    await conSesion(g.token);
    renderApp(`/actividades/${yoga.id}`);

    expect(
      await screen.findByText("La actividad está dada de baja: no se pueden agregar horarios.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agregar horario" })).not.toBeInTheDocument();
  });

  it("una recepcionista ve los horarios pero no puede agregarlos, editarlos ni borrarlos", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    await apiCrearHorario(g.token, {
      actividadId: yoga.id,
      diaSemana: "LUNES",
      horaInicio: "09:00",
      horaFin: "10:00",
    });
    const email = `carla-${crypto.randomUUID()}@test.com`;
    const carla = await apiCrearUsuario(g.token, { nombre: "Carla", apellido: "Recepción", email });
    await conSesion(await apiLoginToken(g.slug, email, carla.password));
    renderApp(`/actividades/${yoga.id}`);

    await screen.findByRole("region", { name: "Horarios" });
    expect(await seccionHorarios().findByText("Lunes · 09:00 a 10:00")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agregar horario" })).not.toBeInTheDocument();
    expect(
      seccionHorarios().queryByRole("button", { name: /Editar|Borrar/ })
    ).not.toBeInTheDocument();
  });
});

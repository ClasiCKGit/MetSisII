import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  apiCrearActividad,
  apiCrearProfesor,
  apiCrearUsuario,
  apiDesactivarActividad,
  apiDesactivarProfesor,
  apiListarVinculos,
  apiLoginToken,
  apiVincularProfesor,
  conSesion,
  nuevoGimnasio,
} from "../helpers/api";
import { esperarQueSeCierreElDialogo } from "../helpers/dialogo";
import { renderApp } from "../helpers/render";

const seccionProfesores = () => screen.getByRole("region", { name: "Profesores" });

describe("detalle de una actividad: profesores asignados", () => {
  it("muestra los datos de la actividad y los profesores que la dan", async () => {
    const g = await nuevoGimnasio();
    const crossfit = await apiCrearActividad(g.token, {
      nombre: "Crossfit",
      descripcion: "Alta intensidad",
      cupo: 15,
    });
    const marina = await apiCrearProfesor(g.token, {
      nombre: "Marina",
      apellido: "Silva",
      especialidad: "Jiu-Jitsu",
    });
    await apiVincularProfesor(g.token, crossfit.id, marina.id);
    await conSesion(g.token);
    renderApp(`/actividades/${crossfit.id}`);

    expect(await screen.findByRole("heading", { name: "Crossfit" })).toBeInTheDocument();
    expect(screen.getByText("Alta intensidad")).toBeInTheDocument();
    expect(screen.getByText("Cupo: 15 personas")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();

    const seccion = within(await screen.findByRole("region", { name: "Profesores" }));
    expect(await seccion.findByText("Marina Silva")).toBeInTheDocument();
    expect(seccion.getByText("Jiu-Jitsu")).toBeInTheDocument();
  });

  it("dice 'Sin límite de cupo' y avisa cuando todavía no hay profesores asignados", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    await conSesion(g.token);
    renderApp(`/actividades/${yoga.id}`);

    expect(await screen.findByText("Sin límite de cupo")).toBeInTheDocument();
    expect(
      await within(seccionProfesores()).findByText(
        "Todavía no hay profesores asignados a esta actividad."
      )
    ).toBeInTheDocument();
  });

  it("asigna un profesor: aparece en la lista, avisa, y deja de ofrecerse", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    await apiCrearProfesor(g.token, { nombre: "Marina", apellido: "Silva" });
    await apiCrearProfesor(g.token, { nombre: "Diego", apellido: "Torres" });
    await conSesion(g.token);
    const { user } = renderApp(`/actividades/${yoga.id}`);

    const selector = await screen.findByLabelText("Asignar un profesor");
    await user.selectOptions(selector, "Diego Torres");
    await user.click(screen.getByRole("button", { name: "Asignar" }));

    expect(await screen.findByText("Profesor asignado")).toBeInTheDocument();
    expect(await within(seccionProfesores()).findByText("Diego Torres")).toBeInTheDocument();
    expect(await apiListarVinculos(g.token, yoga.id)).toHaveLength(1);

    const opciones = within(screen.getByLabelText("Asignar un profesor")).getAllByRole("option");
    expect(opciones.map((o) => o.textContent)).toEqual(["Elegí un profesor", "Marina Silva"]);
  });

  it("no ofrece a los profesores dados de baja ni a los que ya la dan", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    const marina = await apiCrearProfesor(g.token, { nombre: "Marina", apellido: "Silva" });
    const diego = await apiCrearProfesor(g.token, { nombre: "Diego", apellido: "Torres" });
    await apiCrearProfesor(g.token, { nombre: "Lucía", apellido: "Paz" });
    await apiVincularProfesor(g.token, yoga.id, marina.id);
    await apiDesactivarProfesor(g.token, diego.id);
    await conSesion(g.token);
    renderApp(`/actividades/${yoga.id}`);

    const opciones = within(await screen.findByLabelText("Asignar un profesor")).getAllByRole(
      "option"
    );
    expect(opciones.map((o) => o.textContent)).toEqual(["Elegí un profesor", "Lucía Paz"]);
  });

  it("avisa cuando no hay ningún profesor disponible para asignar", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    await conSesion(g.token);
    renderApp(`/actividades/${yoga.id}`);

    expect(
      await screen.findByText("No hay profesores disponibles para asignar.")
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Asignar un profesor")).not.toBeInTheDocument();
  });

  it("quita un profesor solo después de confirmar, y avisa que sus horarios quedan sin profesor", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    const marina = await apiCrearProfesor(g.token, { nombre: "Marina", apellido: "Silva" });
    await apiVincularProfesor(g.token, yoga.id, marina.id);
    await conSesion(g.token);
    const { user } = renderApp(`/actividades/${yoga.id}`);

    // Cancelar no quita nada
    await user.click(await screen.findByRole("button", { name: "Quitar a Marina Silva" }));
    const dialogo = await screen.findByRole("dialog");
    expect(
      within(dialogo).getByText(/Los horarios que tenía asignados quedan sin profesor/)
    ).toBeInTheDocument();
    await user.click(within(dialogo).getByRole("button", { name: "Cancelar" }));
    await esperarQueSeCierreElDialogo();
    expect(await apiListarVinculos(g.token, yoga.id)).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Quitar a Marina Silva" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Quitar profesor" })
    );

    expect(await screen.findByText("Profesor quitado")).toBeInTheDocument();
    expect(
      await within(seccionProfesores()).findByText(
        "Todavía no hay profesores asignados a esta actividad."
      )
    ).toBeInTheDocument();
    expect(await apiListarVinculos(g.token, yoga.id)).toHaveLength(0);
  });

  it("en una actividad dada de baja no se pueden asignar profesores", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    await apiCrearProfesor(g.token, { nombre: "Marina", apellido: "Silva" });
    await apiDesactivarActividad(g.token, yoga.id);
    await conSesion(g.token);
    renderApp(`/actividades/${yoga.id}`);

    expect(
      await screen.findByText("La actividad está dada de baja: no se pueden asignar profesores.")
    ).toBeInTheDocument();
    expect(screen.getByText("Inactiva")).toBeInTheDocument();
    expect(screen.queryByLabelText("Asignar un profesor")).not.toBeInTheDocument();
  });

  it("la recepción ve los profesores asignados pero no tiene cómo asignar ni quitar", async () => {
    const g = await nuevoGimnasio();
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    const marina = await apiCrearProfesor(g.token, { nombre: "Marina", apellido: "Silva" });
    await apiCrearProfesor(g.token, { nombre: "Diego", apellido: "Torres" });
    await apiVincularProfesor(g.token, yoga.id, marina.id);
    const email = `carla@${g.slug}.com`;
    const carla = await apiCrearUsuario(g.token, {
      nombre: "Carla",
      apellido: "Recepción",
      email,
    });
    await conSesion(await apiLoginToken(g.slug, email, carla.password));
    renderApp(`/actividades/${yoga.id}`);

    const seccion = within(await screen.findByRole("region", { name: "Profesores" }));
    expect(await seccion.findByText("Marina Silva")).toBeInTheDocument();
    expect(screen.queryByLabelText("Asignar un profesor")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Quitar/ })).not.toBeInTheDocument();
  });

  it("una actividad de otro gimnasio se ve como 'no encontrada'", async () => {
    const g = await nuevoGimnasio();
    const otro = await nuevoGimnasio();
    const ajena = await apiCrearActividad(otro.token, { nombre: "Ajena" });
    await conSesion(g.token);
    renderApp(`/actividades/${ajena.id}`);

    expect(await screen.findByText("Actividad no encontrada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Volver a actividades" })).toBeInTheDocument();
    expect(screen.queryByText("Ajena")).not.toBeInTheDocument();
  });

  it("desde la lista de actividades se llega al detalle, y se puede volver", async () => {
    const g = await nuevoGimnasio();
    await apiCrearActividad(g.token, { nombre: "Yoga" });
    await conSesion(g.token);
    const { user } = renderApp("/actividades");

    await user.click(await screen.findByRole("link", { name: "Yoga" }));
    expect(await screen.findByRole("heading", { name: "Yoga" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "← Volver a actividades" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Actividades" })).toBeInTheDocument()
    );
  });
});

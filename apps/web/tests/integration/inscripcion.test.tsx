import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  apiCrearActividad,
  apiCrearSocio,
  apiCrearTipoMembresia,
  apiDarDeBajaSocio,
  apiDesactivarActividad,
  apiInscribir,
  apiListarMembresias,
  apiListarPagos,
  conSesion,
  nuevoGimnasio,
  type GimnasioDePrueba,
} from "../helpers/api";
import { esperarQueSeCierreElDialogo } from "../helpers/dialogo";
import { renderApp } from "../helpers/render";

const listaMembresias = () => screen.findByRole("list", { name: "Membresías del socio" });
const listaPagos = () => screen.findByRole("list", { name: "Pagos del socio" });

// Un socio y dos actividades con sus tipos de membresía
async function escenario(g: GimnasioDePrueba) {
  const socio = await apiCrearSocio(g.token, {
    nombre: "Lucía",
    apellido: "Pérez",
    dni: "30111222",
  });
  const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
  const boxeo = await apiCrearActividad(g.token, { nombre: "Boxeo" });
  const mensual = await apiCrearTipoMembresia(g.token, {
    actividadId: yoga.id,
    nombre: "Mensual",
    precio: 12500.5,
    duracionDias: 30,
  });
  await apiCrearTipoMembresia(g.token, {
    actividadId: boxeo.id,
    nombre: "Trimestral",
    precio: 30000,
    duracionDias: 90,
  });
  return { socio, yoga, boxeo, mensual };
}

async function abrirInscripcion(socioId: string) {
  const { user } = renderApp(`/socios/${socioId}`);
  await user.click(await screen.findByRole("button", { name: "Inscribir" }));
  const dialogo = await screen.findByRole("dialog", { name: "Inscribir a una actividad" });
  return { user, dialogo };
}

describe("inscripción de un socio a una actividad", () => {
  it("inscribe al socio y muestra la membresía y el pago pendiente", async () => {
    const g = await nuevoGimnasio();
    const { socio, yoga } = await escenario(g);
    await conSesion(g.token);
    const { user, dialogo } = await abrirInscripcion(socio.id);

    await user.selectOptions(await within(dialogo).findByLabelText("Actividad"), "Yoga");
    await user.selectOptions(
      within(dialogo).getByLabelText("Tipo de membresía"),
      "Mensual · $12.500,50 · 30 días"
    );
    expect(within(dialogo).getByText(/pago pendiente de \$12\.500,50/)).toBeInTheDocument();
    await user.selectOptions(within(dialogo).getByLabelText("Método de pago"), "Transferencia");
    const fecha = within(dialogo).getByLabelText("Fecha de inicio");
    await user.clear(fecha);
    await user.type(fecha, "2026-03-01");
    await user.click(within(dialogo).getByRole("button", { name: "Inscribir" }));

    await esperarQueSeCierreElDialogo();
    expect(await screen.findByText("Socio inscripto")).toBeInTheDocument();
    const membresia = within(await listaMembresias()).getByRole("listitem");
    expect(membresia).toHaveTextContent("Yoga");
    const pago = within(await listaPagos()).getByRole("listitem");
    expect(within(pago).getByText("$12.500,50")).toBeInTheDocument();
    expect(within(pago).getByText("Pendiente")).toBeInTheDocument();

    const [enLaApi] = await apiListarMembresias(g.token, socio.id);
    expect(enLaApi.actividad.id).toBe(yoga.id);
    expect(enLaApi.fechaInicio).toBe("2026-03-01T00:00:00.000Z");
    expect(enLaApi.fechaFin).toBe("2026-03-31T00:00:00.000Z");
    const [pagoEnLaApi] = await apiListarPagos(g.token, socio.id);
    expect(pagoEnLaApi).toMatchObject({ monto: "12500.50", metodoPago: "TRANSFERENCIA" });
  });

  it("ofrece solo los tipos de la actividad elegida y solo actividades activas con tipos", async () => {
    const g = await nuevoGimnasio();
    const { socio, boxeo } = await escenario(g);
    await apiCrearActividad(g.token, { nombre: "Natación" }); // sin tipos de membresía
    await apiDesactivarActividad(g.token, boxeo.id);
    await conSesion(g.token);
    const { user, dialogo } = await abrirInscripcion(socio.id);

    const actividad = await within(dialogo).findByLabelText("Actividad");
    const opciones = within(actividad).getAllByRole("option");
    expect(opciones.map((o) => o.textContent)).toEqual(["Elegí una actividad", "Yoga"]);
    expect(within(dialogo).getByLabelText("Tipo de membresía")).toBeDisabled();

    await user.selectOptions(actividad, "Yoga");
    const tipos = within(within(dialogo).getByLabelText("Tipo de membresía")).getAllByRole(
      "option"
    );
    expect(tipos.map((o) => o.textContent)).toEqual([
      "Elegí el tipo",
      "Mensual · $12.500,50 · 30 días",
    ]);
  });

  it("sin elegir actividad ni tipo no envía nada", async () => {
    const g = await nuevoGimnasio();
    const { socio } = await escenario(g);
    await conSesion(g.token);
    const { user, dialogo } = await abrirInscripcion(socio.id);

    await within(dialogo).findByLabelText("Actividad");
    await user.click(within(dialogo).getByRole("button", { name: "Inscribir" }));

    const errores = await within(dialogo).findAllByRole("alert");
    expect(errores.map((e) => e.textContent)).toEqual([
      "Elegí una actividad",
      "Elegí el tipo de membresía",
    ]);
    expect(await apiListarMembresias(g.token, socio.id)).toHaveLength(0);
  });

  it("muestra el error de la API si el socio ya está inscripto en esa actividad", async () => {
    const g = await nuevoGimnasio();
    const { socio, yoga, mensual } = await escenario(g);
    await apiInscribir(g.token, {
      socioId: socio.id,
      actividadId: yoga.id,
      tipoMembresiaId: mensual.id,
      metodoPago: "EFECTIVO",
    });
    await conSesion(g.token);
    const { user, dialogo } = await abrirInscripcion(socio.id);

    await user.selectOptions(await within(dialogo).findByLabelText("Actividad"), "Yoga");
    await user.selectOptions(
      within(dialogo).getByLabelText("Tipo de membresía"),
      "Mensual · $12.500,50 · 30 días"
    );
    await user.click(within(dialogo).getByRole("button", { name: "Inscribir" }));

    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(
      "El socio ya tiene una membresía activa para esta actividad"
    );
    expect(await apiListarMembresias(g.token, socio.id)).toHaveLength(1);
  });

  it("sin tipos de membresía cargados avisa que primero hay que crearlos", async () => {
    const g = await nuevoGimnasio();
    const socio = await apiCrearSocio(g.token, {
      nombre: "Lucía",
      apellido: "Pérez",
      dni: "30111222",
    });
    await apiCrearActividad(g.token, { nombre: "Yoga" });
    await conSesion(g.token);
    const { dialogo } = await abrirInscripcion(socio.id);

    expect(
      await within(dialogo).findByText(/No hay actividades activas con tipos de membresía/)
    ).toBeInTheDocument();
    expect(within(dialogo).queryByRole("button", { name: "Inscribir" })).not.toBeInTheDocument();
  });

  it("a un socio dado de baja no se lo puede inscribir", async () => {
    const g = await nuevoGimnasio();
    const { socio } = await escenario(g);
    await apiDarDeBajaSocio(g.token, socio.id);
    await conSesion(g.token);
    renderApp(`/socios/${socio.id}`);

    expect(await screen.findByRole("heading", { name: "Lucía Pérez" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Inscribir" })).not.toBeInTheDocument();
  });
});

describe("cobro de los pagos pendientes del socio", () => {
  async function conPagoPendiente() {
    const g = await nuevoGimnasio();
    const { socio, yoga, mensual } = await escenario(g);
    await apiInscribir(g.token, {
      socioId: socio.id,
      actividadId: yoga.id,
      tipoMembresiaId: mensual.id,
      metodoPago: "EFECTIVO",
    });
    await conSesion(g.token);
    const { user } = renderApp(`/socios/${socio.id}`);
    const pago = within(await listaPagos()).getByRole("listitem");
    return { g, socio, user, pago };
  }

  it("marca el pago como cobrado", async () => {
    const { g, socio, user, pago } = await conPagoPendiente();

    await user.click(
      within(pago).getByRole("button", { name: "Marcar como cobrado: Yoga · Mensual" })
    );

    expect(await within(pago).findByText("Pagado")).toBeInTheDocument();
    expect(within(pago).queryByRole("button")).not.toBeInTheDocument();
    const [enLaApi] = await apiListarPagos(g.token, socio.id);
    expect(enLaApi.estado).toBe("PAGADO");
  });

  it("rechaza el pago", async () => {
    const { g, socio, user, pago } = await conPagoPendiente();

    await user.click(within(pago).getByRole("button", { name: "Rechazar: Yoga · Mensual" }));

    expect(await within(pago).findByText("Rechazado")).toBeInTheDocument();
    const [enLaApi] = await apiListarPagos(g.token, socio.id);
    expect(enLaApi.estado).toBe("RECHAZADO");
  });
});

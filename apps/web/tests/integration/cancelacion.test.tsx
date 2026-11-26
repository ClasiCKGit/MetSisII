import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  apiCrearActividad,
  apiCrearSocio,
  apiCrearTipoMembresia,
  apiCrearUsuario,
  apiInscribir,
  apiListarMembresias,
  apiListarPagos,
  apiLoginToken,
  apiRenovar,
  conSesion,
  nuevoGimnasio,
} from "../helpers/api";
import { esperarQueSeCierreElDialogo } from "../helpers/dialogo";
import { renderApp } from "../helpers/render";

const DIA = 24 * 60 * 60 * 1000;
const haceDias = (dias: number) => new Date(Date.now() - dias * DIA).toISOString();
const listaMembresias = () => screen.findByRole("list", { name: "Membresías del socio" });
const dialogoCancelar = () => screen.findByRole("dialog", { name: "Cancelar membresía" });

async function socioInscripto() {
  const g = await nuevoGimnasio();
  const socio = await apiCrearSocio(g.token, {
    nombre: "Lucía",
    apellido: "Pérez",
    dni: String(Date.now()).slice(-8),
  });
  const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
  const mensual = await apiCrearTipoMembresia(g.token, {
    actividadId: yoga.id,
    nombre: "Mensual",
    precio: 12500,
    duracionDias: 30,
  });
  const membresia = await apiInscribir(g.token, {
    socioId: socio.id,
    actividadId: yoga.id,
    tipoMembresiaId: mensual.id,
    metodoPago: "EFECTIVO",
    fechaInicio: haceDias(25),
  });
  return { g, socio, membresia };
}

describe("cancelación de membresías", () => {
  it("cancela después de confirmar: la membresía queda cancelada y su pago pendiente rechazado", async () => {
    const { g, socio, membresia } = await socioInscripto();
    await conSesion(g.token);
    const { user } = renderApp(`/socios/${socio.id}`);

    const fila = within(await listaMembresias()).getByRole("listitem");
    await user.click(within(fila).getByRole("button", { name: "Cancelar Yoga" }));
    const dialogo = within(await dialogoCancelar());
    expect(dialogo.getByText(/Sus pagos pendientes se marcan como rechazados/)).toBeInTheDocument();
    await user.click(dialogo.getByRole("button", { name: "Cancelar membresía" }));

    expect(await screen.findByText("Membresía cancelada")).toBeInTheDocument();
    expect(screen.getByText("Yoga: 1 pago pendiente quedó rechazado")).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();

    const filaCancelada = within(await listaMembresias()).getByRole("listitem");
    expect(await within(filaCancelada).findByText("Cancelada")).toBeInTheDocument();
    // Una cancelada no se vuelve a cancelar ni se renueva
    expect(within(filaCancelada).queryByRole("button")).toBeNull();

    const [guardada] = await apiListarMembresias(g.token, socio.id);
    expect(guardada).toMatchObject({ id: membresia.id, estado: "CANCELADA" });
    const [pago] = await apiListarPagos(g.token, socio.id);
    expect(pago?.estado).toBe("RECHAZADO");
    expect(
      await within(await screen.findByRole("list", { name: "Pagos del socio" })).findByText(
        "Rechazado"
      )
    ).toBeInTheDocument();
  });

  it("al volver no cancela nada", async () => {
    const { g, socio } = await socioInscripto();
    await conSesion(g.token);
    const { user } = renderApp(`/socios/${socio.id}`);

    await user.click(await screen.findByRole("button", { name: "Cancelar Yoga" }));
    await user.click(within(await dialogoCancelar()).getByRole("button", { name: "Volver" }));
    await esperarQueSeCierreElDialogo();

    const [membresia] = await apiListarMembresias(g.token, socio.id);
    expect(membresia).toMatchObject({ estado: "ACTIVA" });
  });

  it("cancelar una renovación vuelve a ofrecer renovar la anterior", async () => {
    const { g, socio, membresia } = await socioInscripto();
    await apiRenovar(g.token, membresia.id);
    await conSesion(g.token);
    const { user } = renderApp(`/socios/${socio.id}`);

    await within(await listaMembresias()).findAllByRole("listitem");
    expect(screen.getAllByRole("button", { name: "Renovar Yoga" })).toHaveLength(1);
    const renovacion = within(await listaMembresias())
      .getAllByRole("listitem")
      .find((fila) => !fila.textContent?.includes("renovada"));
    await user.click(within(renovacion!).getByRole("button", { name: "Cancelar Yoga" }));
    await user.click(
      within(await dialogoCancelar()).getByRole("button", { name: "Cancelar membresía" })
    );

    expect(await screen.findByText("Membresía cancelada")).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();
    const anterior = (await apiListarMembresias(g.token, socio.id)).find(
      (m) => m.id === membresia.id
    );
    expect(anterior?.renovada).toBe(false);
    expect(await screen.findByRole("button", { name: "Renovar Yoga" })).toBeInTheDocument();
  });

  it("la recepción no ve el botón para cancelar", async () => {
    const { g, socio } = await socioInscripto();
    const email = `carla-${crypto.randomUUID()}@test.com`;
    const carla = await apiCrearUsuario(g.token, { nombre: "Carla", apellido: "Recepción", email });
    await conSesion(await apiLoginToken(g.slug, email, carla.password));
    renderApp(`/socios/${socio.id}`);

    await listaMembresias();
    expect(await screen.findByRole("button", { name: "Renovar Yoga" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar Yoga" })).toBeNull();
  });
});

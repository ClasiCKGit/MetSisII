import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  apiCrearActividad,
  apiCrearSocio,
  apiCrearTipoMembresia,
  apiDarDeBajaSocio,
  apiDarDeBajaTipoMembresia,
  apiInscribir,
  apiListarMembresias,
  apiListarPagos,
  apiRenovar,
  conSesion,
  nuevoGimnasio,
} from "../helpers/api";
import { esperarQueSeCierreElDialogo } from "../helpers/dialogo";
import { renderApp } from "../helpers/render";

const DIA = 24 * 60 * 60 * 1000;
const haceDias = (dias: number) => new Date(Date.now() - dias * DIA).toISOString();
const listaMembresias = () => screen.findByRole("list", { name: "Membresías del socio" });
const dialogoRenovar = () => screen.findByRole("dialog", { name: "Renovar membresía" });

// Socio inscripto a Yoga con un plan mensual que empezó hace `empezoHaceDias` días
async function socioConMembresia(empezoHaceDias: number) {
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
    fechaInicio: haceDias(empezoHaceDias),
  });
  return { g, socio, yoga, mensual, membresia };
}

describe("renovación de membresías", () => {
  it("renueva una membresía por vencer con el mismo plan: empieza cuando termina la actual", async () => {
    const { g, socio, membresia } = await socioConMembresia(25);
    await conSesion(g.token);
    const { user } = renderApp(`/socios/${socio.id}`);

    const fila = within(await listaMembresias()).getByRole("listitem");
    expect(within(fila).getByText("Por vencer")).toBeInTheDocument();
    await user.click(within(fila).getByRole("button", { name: "Renovar Yoga" }));

    const dialogo = within(await dialogoRenovar());
    expect(
      await dialogo.findByText(/La renovación empieza el .*, cuando vence la actual\./)
    ).toBeInTheDocument();
    expect(dialogo.getByLabelText("Tipo de membresía")).toHaveDisplayValue(/^Mensual/);
    expect(dialogo.getByText("Se registra un pago pendiente de $12.500,00.")).toBeInTheDocument();
    await user.selectOptions(dialogo.getByLabelText("Método de pago"), "Transferencia");
    await user.click(dialogo.getByRole("button", { name: "Renovar" }));

    expect(await screen.findByText("Membresía renovada")).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();

    const membresias = await apiListarMembresias(g.token, socio.id);
    expect(membresias).toHaveLength(2);
    const vieja = membresias.find((m) => m.id === membresia.id);
    const nueva = membresias.find((m) => m.id !== membresia.id);
    expect(vieja).toMatchObject({ renovada: true });
    expect(nueva?.fechaInicio).toBe(vieja?.fechaFin);
    const pagos = await apiListarPagos(g.token, socio.id);
    expect(pagos).toContainEqual(
      expect.objectContaining({ membresiaId: nueva?.id, metodoPago: "TRANSFERENCIA" })
    );

    // La vieja queda marcada como renovada y ya no ofrece renovarse; la nueva sí
    const filas = within(await listaMembresias()).getAllByRole("listitem");
    const filaVieja = filas.find((f) => f.textContent?.includes("renovada"));
    expect(filaVieja).toBeDefined();
    expect(within(filaVieja!).queryByRole("button", { name: "Renovar Yoga" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Renovar Yoga" })).toHaveLength(1);
  });

  it("renueva con otro plan de la misma actividad y cobra su precio", async () => {
    const { g, socio, yoga } = await socioConMembresia(25);
    await apiCrearTipoMembresia(g.token, {
      actividadId: yoga.id,
      nombre: "Trimestral",
      precio: 33000,
      duracionDias: 90,
    });
    await conSesion(g.token);
    const { user } = renderApp(`/socios/${socio.id}`);

    await user.click(await screen.findByRole("button", { name: "Renovar Yoga" }));
    const dialogo = within(await dialogoRenovar());
    await user.selectOptions(
      await dialogo.findByLabelText("Tipo de membresía"),
      "Trimestral · $33.000,00 · 90 días"
    );
    expect(dialogo.getByText("Se registra un pago pendiente de $33.000,00.")).toBeInTheDocument();
    await user.click(dialogo.getByRole("button", { name: "Renovar" }));

    expect(await screen.findByText("Membresía renovada")).toBeInTheDocument();
    const pagos = await apiListarPagos(g.token, socio.id);
    expect(pagos.map((p) => Number(p.monto)).sort((a, b) => a - b)).toEqual([12500, 33000]);
  });

  it("una membresía vencida se renueva desde hoy", async () => {
    const { g, socio } = await socioConMembresia(40);
    await conSesion(g.token);
    const { user } = renderApp(`/socios/${socio.id}`);

    const fila = within(await listaMembresias()).getByRole("listitem");
    expect(within(fila).getByText("Vencida")).toBeInTheDocument();
    await user.click(within(fila).getByRole("button", { name: "Renovar Yoga" }));

    const dialogo = within(await dialogoRenovar());
    expect(
      await dialogo.findByText("La membresía ya venció: la renovación empieza hoy.")
    ).toBeInTheDocument();
    await user.click(dialogo.getByRole("button", { name: "Renovar" }));

    expect(await screen.findByText("Membresía renovada")).toBeInTheDocument();
    await esperarQueSeCierreElDialogo();
    expect(await within(await listaMembresias()).findByText("Al día")).toBeInTheDocument();
  });

  it("si el plan se dio de baja pide elegir otro, y sin planes activos lo avisa", async () => {
    const { g, socio, mensual } = await socioConMembresia(25);
    await apiDarDeBajaTipoMembresia(g.token, mensual.id);
    await conSesion(g.token);
    const { user } = renderApp(`/socios/${socio.id}`);

    await user.click(await screen.findByRole("button", { name: "Renovar Yoga" }));
    const dialogo = within(await dialogoRenovar());
    expect(
      await dialogo.findByText(
        "Yoga no tiene tipos de membresía activos. Un administrador tiene que cargar uno antes de renovar."
      )
    ).toBeInTheDocument();
    expect(dialogo.queryByRole("button", { name: "Renovar" })).toBeNull();
  });

  it("un socio dado de baja no ofrece renovar", async () => {
    const { g, socio } = await socioConMembresia(25);
    await apiDarDeBajaSocio(g.token, socio.id);
    await conSesion(g.token);
    renderApp(`/socios/${socio.id}`);

    expect(within(await listaMembresias()).getByText("Por vencer")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Renovar Yoga" })).toBeNull();
  });

  it("la membresía renovada deja de figurar en los vencimientos del inicio", async () => {
    const { g, membresia } = await socioConMembresia(25);
    await apiRenovar(g.token, membresia.id);
    await conSesion(g.token);
    renderApp("/");

    expect(
      await screen.findByText("No hay membresías por vencer en los próximos 7 días.")
    ).toBeInTheDocument();
  });
});

import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  apiCrearActividad,
  apiCrearPago,
  apiCrearSocio,
  apiCrearTipoMembresia,
  apiDarDeBajaSocio,
  apiInscribir,
  conSesion,
  nuevoGimnasio,
} from "../helpers/api";
import { renderApp } from "../helpers/render";

const tarjeta = (titulo: string) => screen.getByRole("article", { name: titulo });

describe("inicio: métricas del gimnasio", () => {
  it("muestra la cantidad de socios activos del propio gimnasio", async () => {
    const g = await nuevoGimnasio();
    const otro = await nuevoGimnasio();
    await apiCrearSocio(g.token, { nombre: "Lucía", apellido: "Pérez", dni: "30111222" });
    const juan = await apiCrearSocio(g.token, {
      nombre: "Juan",
      apellido: "Álvarez",
      dni: "28999888",
    });
    await apiCrearSocio(g.token, { nombre: "Ana", apellido: "Gómez", dni: "27000111" });
    await apiDarDeBajaSocio(g.token, juan.id);
    await apiCrearSocio(otro.token, { nombre: "Ajeno", apellido: "Otro", dni: "30000002" });
    await conSesion(g.token);
    renderApp("/");

    await screen.findByText("Hola, Ana");
    expect(await within(tarjeta("Socios activos")).findByText("2")).toBeInTheDocument();
    expect(
      within(tarjeta("Socios activos")).getByText("Socios que no están dados de baja.")
    ).toBeInTheDocument();
  });

  it("con un gimnasio sin socios muestra 0", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    renderApp("/");

    expect(
      await within(await screen.findByRole("article", { name: "Socios activos" })).findByText("0")
    ).toBeInTheDocument();
  });

  it("al dar de alta un socio, el número del inicio se actualiza", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/");
    expect(
      await within(await screen.findByRole("article", { name: "Socios activos" })).findByText("0")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Socios" }));
    await user.click(await screen.findByRole("button", { name: "Nuevo socio" }));
    const dialogo = await screen.findByRole("dialog");
    await user.type(within(dialogo).getByLabelText("Nombre"), "Lucía");
    await user.type(within(dialogo).getByLabelText("Apellido"), "Pérez");
    await user.type(within(dialogo).getByLabelText("DNI"), "30111222");
    await user.click(within(dialogo).getByRole("button", { name: "Crear socio" }));
    await screen.findByText("Socio creado");

    await user.click(screen.getByRole("link", { name: "Inicio" }));
    expect(await within(tarjeta("Socios activos")).findByText("1")).toBeInTheDocument();
  });

  it("con un gimnasio nuevo los ingresos están en $0,00 y no hay vencimientos", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    renderApp("/");

    const ingresos = await screen.findByRole("article", { name: "Ingresos del mes" });
    expect(await within(ingresos).findByText("$0,00")).toBeInTheDocument();
    expect(within(tarjeta("Vencimientos próximos")).getByText("0")).toBeInTheDocument();
    expect(
      await screen.findByText("No hay membresías por vencer en los próximos 7 días.")
    ).toBeInTheDocument();
  });

  it("los ingresos del mes suman solo los pagos cobrados", async () => {
    const g = await nuevoGimnasio();
    const socio = await apiCrearSocio(g.token, {
      nombre: "Lucía",
      apellido: "Pérez",
      dni: "30111222",
    });
    await apiCrearPago(g.token, {
      socioId: socio.id,
      monto: "1000.25",
      metodoPago: "EFECTIVO",
      estado: "PAGADO",
    });
    await apiCrearPago(g.token, {
      socioId: socio.id,
      monto: "500.50",
      metodoPago: "TARJETA",
      estado: "PAGADO",
    });
    await apiCrearPago(g.token, {
      socioId: socio.id,
      monto: "9999",
      metodoPago: "EFECTIVO",
      estado: "PENDIENTE",
    });
    await apiCrearPago(g.token, {
      socioId: socio.id,
      monto: "9999",
      metodoPago: "EFECTIVO",
      estado: "RECHAZADO",
    });
    await conSesion(g.token);
    renderApp("/");

    const ingresos = await screen.findByRole("article", { name: "Ingresos del mes" });
    expect(await within(ingresos).findByText("$1.500,75")).toBeInTheDocument();
  });

  it("muestra cuántas membresías vencen esta semana y lista a esos socios con enlace a su detalle", async () => {
    const g = await nuevoGimnasio();
    const lucia = await apiCrearSocio(g.token, {
      nombre: "Lucía",
      apellido: "Pérez",
      dni: "30111222",
    });
    const juan = await apiCrearSocio(g.token, {
      nombre: "Juan",
      apellido: "Álvarez",
      dni: "28999888",
    });
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    const semanal = await apiCrearTipoMembresia(g.token, {
      actividadId: yoga.id,
      nombre: "Semanal",
      precio: 3000,
      duracionDias: 5,
    });
    const mensual = await apiCrearTipoMembresia(g.token, {
      actividadId: yoga.id,
      nombre: "Mensual",
      precio: 10000,
      duracionDias: 30,
    });
    // Lucía vence en 5 días; Juan, en 30 (todavía al día)
    await apiInscribir(g.token, {
      socioId: lucia.id,
      actividadId: yoga.id,
      tipoMembresiaId: semanal.id,
      metodoPago: "EFECTIVO",
    });
    await apiInscribir(g.token, {
      socioId: juan.id,
      actividadId: yoga.id,
      tipoMembresiaId: mensual.id,
      metodoPago: "EFECTIVO",
    });
    await conSesion(g.token);
    const { user, router } = renderApp("/");

    const tarjetaVencimientos = await screen.findByRole("article", {
      name: "Vencimientos próximos",
    });
    expect(await within(tarjetaVencimientos).findByText("1")).toBeInTheDocument();

    const lista = await screen.findByRole("list", { name: "Membresías por vencer" });
    expect(within(lista).getAllByRole("listitem")).toHaveLength(1);
    expect(within(lista).getByText("Yoga · Semanal")).toBeInTheDocument();
    expect(within(lista).queryByText(/Álvarez/)).not.toBeInTheDocument();

    await user.click(within(lista).getByRole("link", { name: "Pérez, Lucía" }));
    expect(await screen.findByRole("heading", { name: "Lucía Pérez" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/socios/${lucia.id}`);
  });
});

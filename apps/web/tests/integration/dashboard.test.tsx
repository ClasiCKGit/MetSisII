import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiCrearSocio, apiDarDeBajaSocio, conSesion, nuevoGimnasio } from "../helpers/api";
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

  it("los ingresos del mes siguen sin datos hasta que exista el registro de pagos", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    renderApp("/");

    const ingresos = await screen.findByRole("article", { name: "Ingresos del mes" });
    expect(within(ingresos).getByText("—")).toBeInTheDocument();
  });
});

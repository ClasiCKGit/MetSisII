import { expect, test } from "@playwright/test";
import {
  crearActividadConPlan,
  crearGimnasio,
  crearSocio,
  iniciarSesion,
  inscribir,
} from "./helpers.ts";

test.describe("socios y membresías", () => {
  test("da de alta un socio, lo inscribe a una actividad y queda el pago pendiente", async ({
    page,
    request,
  }) => {
    const gimnasio = await crearGimnasio(request);
    await crearActividadConPlan(request, gimnasio.token, "Yoga");
    await iniciarSesion(page, gimnasio);

    await page
      .getByRole("navigation", { name: "Principal" })
      .getByRole("link", { name: "Socios" })
      .click();
    await page.getByRole("button", { name: "Nuevo socio" }).click();
    const alta = page.getByRole("dialog", { name: "Nuevo socio" });
    await alta.getByLabel("Nombre").fill("Lucía");
    await alta.getByLabel("Apellido").fill("Pérez");
    await alta.getByLabel("DNI").fill(String(Math.floor(10_000_000 + Math.random() * 89_999_999)));
    await alta.getByRole("button", { name: "Crear socio" }).click();
    await expect(alta).toBeHidden();

    await page.getByRole("link", { name: "Pérez, Lucía" }).click();
    await expect(page.getByRole("heading", { name: "Lucía Pérez" })).toBeVisible();

    await page.getByRole("button", { name: "Inscribir" }).click();
    const inscripcion = page.getByRole("dialog", { name: "Inscribir a una actividad" });
    await inscripcion.getByLabel("Actividad").selectOption({ label: "Yoga" });
    await inscripcion.getByLabel("Tipo de membresía").selectOption({ index: 1 });
    await expect(
      inscripcion.getByText("Se registra un pago pendiente de $12.500,00.")
    ).toBeVisible();
    await inscripcion.getByRole("button", { name: "Inscribir" }).click();
    await expect(inscripcion).toBeHidden();

    const membresias = page.getByRole("list", { name: "Membresías del socio" });
    await expect(membresias.getByText("Yoga")).toBeVisible();
    await expect(membresias.getByText("Al día")).toBeVisible();
    const pagos = page.getByRole("list", { name: "Pagos del socio" });
    await expect(pagos.getByText("$12.500,00")).toBeVisible();
    await expect(pagos.getByText("Pendiente")).toBeVisible();
  });

  test("renueva una membresía por vencer y deja de figurar en los vencimientos del inicio", async ({
    page,
    request,
  }) => {
    const gimnasio = await crearGimnasio(request);
    const { actividad, plan } = await crearActividadConPlan(request, gimnasio.token, "Spinning");
    const socio = await crearSocio(request, gimnasio.token, {
      nombre: "Juan",
      apellido: "Álvarez",
    });
    // Empezó hace 25 días con un plan de 30: vence en 5
    await inscribir(request, gimnasio.token, {
      socioId: socio.id,
      actividadId: actividad.id,
      tipoMembresiaId: plan.id,
      fechaInicio: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await iniciarSesion(page, gimnasio);

    const porVencer = page.getByRole("list", { name: "Membresías por vencer" });
    await porVencer.getByRole("link", { name: "Álvarez, Juan" }).click();
    await expect(page.getByRole("heading", { name: "Juan Álvarez" })).toBeVisible();

    await page.getByRole("button", { name: "Renovar Spinning" }).click();
    const renovar = page.getByRole("dialog", { name: "Renovar membresía" });
    await expect(renovar.getByText(/cuando vence la actual/)).toBeVisible();
    await renovar.getByRole("button", { name: "Renovar" }).click();
    await expect(renovar).toBeHidden();
    await expect(
      page.getByRole("list", { name: "Membresías del socio" }).getByRole("listitem")
    ).toHaveCount(2);

    await page
      .getByRole("navigation", { name: "Principal" })
      .getByRole("link", { name: "Inicio" })
      .click();
    await expect(
      page.getByText("No hay membresías por vencer en los próximos 7 días.")
    ).toBeVisible();
  });

  test("los datos de un gimnasio no aparecen en otro", async ({ page, request }) => {
    const propio = await crearGimnasio(request);
    const ajeno = await crearGimnasio(request);
    await crearSocio(request, ajeno.token, { nombre: "Socio", apellido: "Ajeno" });
    const socioPropio = await crearSocio(request, propio.token, {
      nombre: "Socio",
      apellido: "Propio",
    });
    await iniciarSesion(page, propio);

    await page.goto("/socios");
    await expect(page.getByRole("link", { name: "Propio, Socio" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ajeno, Socio" })).toHaveCount(0);
    expect(socioPropio.id).toBeTruthy();
  });
});

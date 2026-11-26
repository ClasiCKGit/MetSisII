import { expect, test } from "@playwright/test";
import { crearGimnasio, crearRecepcionista, iniciarSesion } from "./helpers.ts";

test.describe("sesión", () => {
  test("sin sesión lleva al login, y después de iniciar sesión vuelve a la página pedida", async ({
    page,
    request,
  }) => {
    const gimnasio = await crearGimnasio(request);

    await page.goto("/socios");
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Gimnasio").fill(gimnasio.slug);
    await page.getByLabel("Email").fill(gimnasio.email);
    await page.getByLabel("Contraseña").fill(gimnasio.password);
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page).toHaveURL(/\/socios$/);
    await expect(page.getByRole("heading", { name: "Socios" })).toBeVisible();
  });

  test("con credenciales inválidas avisa y se queda en el login", async ({ page, request }) => {
    const gimnasio = await crearGimnasio(request);

    await page.goto("/login");
    await page.getByLabel("Gimnasio").fill(gimnasio.slug);
    await page.getByLabel("Email").fill(gimnasio.email);
    await page.getByLabel("Contraseña").fill("otra-clave");
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page.getByText("Credenciales inválidas")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("la sesión sobrevive a recargar, incluso en una pantalla que se carga aparte", async ({
    page,
    request,
  }) => {
    const gimnasio = await crearGimnasio(request);
    await iniciarSesion(page, gimnasio);

    await page.goto("/actividades");
    await expect(page.getByRole("heading", { name: "Actividades" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Actividades" })).toBeVisible();
  });

  test("al salir vuelve al login con el gimnasio precargado", async ({ page, request }) => {
    const gimnasio = await crearGimnasio(request);
    await iniciarSesion(page, gimnasio);

    await page.getByRole("button", { name: "Salir" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel("Gimnasio")).toHaveValue(gimnasio.slug);
  });

  test("la recepción no ve las opciones de administrador ni puede abrirlas", async ({
    page,
    request,
  }) => {
    const gimnasio = await crearGimnasio(request);
    const recepcion = await crearRecepcionista(request, gimnasio);
    await iniciarSesion(page, { slug: gimnasio.slug, ...recepcion });

    const menu = page.getByRole("navigation", { name: "Principal" });
    await expect(menu.getByRole("link", { name: "Socios" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Usuarios" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Gimnasio" })).toHaveCount(0);

    await page.goto("/usuarios");
    await expect(page.getByText("No tenés permisos para ver esta página")).toBeVisible();
  });
});

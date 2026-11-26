import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiLoginStatus, nuevoGimnasio, tokenDeResetDelUltimoMail } from "../helpers/api";
import { USANDO_API_REAL } from "../helpers/modo";
import { renderApp } from "../helpers/render";

describe("olvidé mi contraseña", () => {
  it("muestra la pantalla de éxito, exista o no el email (no revela nada)", async () => {
    const { user } = renderApp("/olvide-mi-contrasena");

    await user.type(screen.getByLabelText("Gimnasio"), "gimnasio-que-no-existe");
    await user.type(screen.getByLabelText("Email"), "nadie@test.com");
    await user.click(screen.getByRole("button", { name: "Enviar instrucciones" }));

    expect(await screen.findByText("Revisá tu email")).toBeInTheDocument();
  });

  it("desde el login se puede llegar al formulario de recuperación", async () => {
    const { user } = renderApp("/login");

    await user.click(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" }));

    expect(await screen.findByText("¿Olvidaste tu contraseña?")).toBeInTheDocument();
  });
});

describe("restablecer contraseña", () => {
  it("sin token en la URL muestra el link como inválido", async () => {
    renderApp("/reset-password");

    expect(await screen.findByText("Link inválido")).toBeInTheDocument();
  });

  it("con un token que no existe, muestra el error del servidor", async () => {
    const { user } = renderApp("/reset-password?token=no-existe");

    await user.type(screen.getByLabelText("Contraseña nueva"), "nueva-clave-123");
    await user.type(screen.getByLabelText("Repetir contraseña nueva"), "nueva-clave-123");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(await screen.findByText("El link no es válido o expiró")).toBeInTheDocument();
  });

  it("valida en el cliente que las contraseñas coincidan", async () => {
    const { user } = renderApp("/reset-password?token=cualquiera");

    await user.type(screen.getByLabelText("Contraseña nueva"), "nueva-clave-123");
    await user.type(screen.getByLabelText("Repetir contraseña nueva"), "no-coincide");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(await screen.findByText("Las contraseñas no coinciden")).toBeInTheDocument();
  });

  // El token se lee de la API falsa: la real lo manda por mail y guarda solo su hash
  it.skipIf(USANDO_API_REAL)(
    "con un token válido cambia la contraseña y permite iniciar sesión con la nueva",
    async () => {
      const g = await nuevoGimnasio();
      const { user, router } = renderApp("/olvide-mi-contrasena");

      await user.type(screen.getByLabelText("Gimnasio"), g.slug);
      await user.type(screen.getByLabelText("Email"), g.email);
      await user.click(screen.getByRole("button", { name: "Enviar instrucciones" }));
      await screen.findByText("Revisá tu email");

      const token = tokenDeResetDelUltimoMail();
      router.navigate(`/reset-password?token=${token}`);

      await user.type(await screen.findByLabelText("Contraseña nueva"), "nueva-clave-123");
      await user.type(screen.getByLabelText("Repetir contraseña nueva"), "nueva-clave-123");
      await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

      expect(await screen.findByText("Contraseña actualizada")).toBeInTheDocument();
      expect(await apiLoginStatus(g.slug, g.email, "nueva-clave-123")).toBe(200);
      expect(await apiLoginStatus(g.slug, g.email, g.password)).toBe(401);
    }
  );
});

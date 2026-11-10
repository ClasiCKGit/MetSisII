import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth.store";
import { apiLoginStatus, nuevoGimnasio } from "../helpers/api";
import { renderApp } from "../helpers/render";

describe("registro de gimnasio", () => {
  it("el identificador se completa solo desde el nombre, hasta que se edita a mano", async () => {
    const { user } = renderApp("/registro");

    const nombre = await screen.findByLabelText("Nombre del gimnasio");
    const slug = screen.getByLabelText("Identificador");

    await user.type(nombre, "Gimnasio Ñandú Bahía");
    expect(slug).toHaveValue("gimnasio-nandu-bahia");

    await user.clear(slug);
    await user.type(slug, "mi-gimnasio");
    await user.type(nombre, " Norte");
    expect(slug).toHaveValue("mi-gimnasio"); // ya no se pisa
  });

  it("valida en el cliente: campos vacíos, identificador inválido y reservado, contraseñas distintas", async () => {
    const { user } = renderApp("/registro");
    await screen.findByText("Registrá tu gimnasio", { selector: '[data-slot="card-title"]' });

    await user.click(screen.getByRole("button", { name: "Crear gimnasio" }));
    expect(
      await screen.findByText("El nombre debe tener al menos 2 caracteres")
    ).toBeInTheDocument();
    expect(screen.getByText("Ingresá tu email")).toBeInTheDocument();

    const slug = screen.getByLabelText("Identificador");
    await user.type(slug, "Con Espacios");
    await user.click(screen.getByRole("button", { name: "Crear gimnasio" }));
    expect(
      await screen.findByText(
        "Solo minúsculas, números y guiones (sin guiones al inicio o al final)"
      )
    ).toBeInTheDocument();

    await user.clear(slug);
    await user.type(slug, "admin");
    await user.click(screen.getByRole("button", { name: "Crear gimnasio" }));
    expect(await screen.findByText("Ese identificador está reservado")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nombre del gimnasio"), "Gym");
    await user.clear(slug);
    await user.type(slug, "gym-valido");
    await user.type(screen.getByLabelText("Tu nombre"), "Ana");
    await user.type(screen.getByLabelText("Tu apellido"), "Pérez");
    await user.type(screen.getByLabelText("Email"), "ana@mail.com");
    await user.type(screen.getByLabelText("Contraseña"), "clave12345");
    await user.type(screen.getByLabelText("Repetir contraseña"), "otra-distinta");
    await user.click(screen.getByRole("button", { name: "Crear gimnasio" }));
    expect(await screen.findByText("Las contraseñas no coinciden")).toBeInTheDocument();
  });

  it("registra el gimnasio, deja al usuario adentro y muestra un aviso", async () => {
    const slug = `reg-${Date.now().toString(36)}`;
    const { user, router } = renderApp("/registro");

    await user.type(await screen.findByLabelText("Nombre del gimnasio"), "Gym Nuevo");
    const campoSlug = screen.getByLabelText("Identificador");
    await user.clear(campoSlug);
    await user.type(campoSlug, slug);
    await user.type(screen.getByLabelText("Tu nombre"), "Lucía");
    await user.type(screen.getByLabelText("Tu apellido"), "Gómez");
    await user.type(screen.getByLabelText("Email"), `lucia@${slug}.com`);
    await user.type(screen.getByLabelText("Contraseña"), "clave12345");
    await user.type(screen.getByLabelText("Repetir contraseña"), "clave12345");
    await user.click(screen.getByRole("button", { name: "Crear gimnasio" }));

    expect(await screen.findByText("Hola, Lucía")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    expect(await screen.findByText("¡Gimnasio creado!")).toBeInTheDocument();
    expect(useAuthStore.getState().usuario?.rol).toBe("ADMIN");
    expect(await apiLoginStatus(slug, `lucia@${slug}.com`, "clave12345")).toBe(200);
  });

  it("si el identificador ya existe, el error aparece en ese campo y no cierra nada", async () => {
    const existente = await nuevoGimnasio();
    const { user, router } = renderApp("/registro");

    await user.type(await screen.findByLabelText("Nombre del gimnasio"), "Otro Gym");
    const campoSlug = screen.getByLabelText("Identificador");
    await user.clear(campoSlug);
    await user.type(campoSlug, existente.slug);
    await user.type(screen.getByLabelText("Tu nombre"), "Ana");
    await user.type(screen.getByLabelText("Tu apellido"), "Pérez");
    await user.type(screen.getByLabelText("Email"), "otra@mail.com");
    await user.type(screen.getByLabelText("Contraseña"), "clave12345");
    await user.type(screen.getByLabelText("Repetir contraseña"), "clave12345");
    await user.click(screen.getByRole("button", { name: "Crear gimnasio" }));

    expect(await screen.findByText("Ese identificador ya está en uso")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/registro");
    expect(useAuthStore.getState().token).toBeNull();
    // No aparece además el aviso general: el error es del campo
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("desde el login hay un enlace al registro, y viceversa", async () => {
    const { user, router } = renderApp("/login");
    await user.click(await screen.findByRole("link", { name: "Registrá tu gimnasio" }));
    expect(router.state.location.pathname).toBe("/registro");
    await user.click(await screen.findByRole("link", { name: "Ya tengo una cuenta" }));
    expect(router.state.location.pathname).toBe("/login");
  });
});
